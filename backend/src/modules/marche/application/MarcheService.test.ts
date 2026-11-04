import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { agent, contribuable, fakeAuditTrail, fakeContribuables } from '../../../shared/testing/ports';
import type { MarcheRepository, MarketPayment, MarketPlace } from '../domain/Marche';
import { MarcheService, normalizeMarketPlaceStatus } from './MarcheService';

function place(overrides: Partial<MarketPlace> = {}): MarketPlace {
  return {
    id: 'place-1',
    numeroPlace: 'A-01',
    type: 'Étal',
    zone: 'Zone A',
    occupantId: null,
    activite: null,
    telephone: null,
    dateAttribution: null,
    tarif: 5000,
    periode: 'mensuel',
    statut: 'LIBRE',
    year: 2026,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    occupantNom: null,
    occupantPrenom: null,
    occupantNin: null,
    occupantTelephone: null,
    ...overrides,
  };
}

function paymentFrom(
  values: Pick<MarketPayment, 'placeId' | 'montant' | 'reference' | 'periode' | 'statut' | 'year'> & { datePaiement: Date },
  row: MarketPlace
): MarketPayment {
  return {
    ...values,
    id: 'paiement-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    numeroPlace: row.numeroPlace,
    placeType: row.type,
    placeZone: row.zone,
    occupantId: row.occupantId,
    activite: row.activite,
    tarif: row.tarif,
    placePeriode: row.periode,
    placeStatut: row.statut,
    placeTelephone: row.telephone,
    placeDateAttribution: row.dateAttribution,
    occupantNom: row.occupantNom,
    occupantPrenom: row.occupantPrenom,
    occupantNin: row.occupantNin,
    occupantTelephone: row.occupantTelephone,
  };
}

describe('MarcheService', () => {
  let repository: jest.Mocked<MarcheRepository>;
  let auditTrail: ReturnType<typeof fakeAuditTrail>;
  let service: MarcheService;

  beforeEach(() => {
    repository = {
      listPlaces: jest.fn(),
      findPlaceById: jest.fn(),
      findPlaceIdByNumero: jest.fn().mockResolvedValue(null),
      createPlace: jest.fn(async (values, occupant) => place({ ...values, ...occupant })),
      updatePlace: jest.fn(async (id, values, occupant) => place({ id, ...values, ...occupant })),
      listPayments: jest.fn(),
      createPayment: jest.fn(async (values, row) => paymentFrom(values, row)),
      findPaymentsForPeriod: jest.fn().mockResolvedValue([]),
      settlePayment: jest.fn(async (id, values, row) =>
        paymentFrom({ ...values, placeId: row.id, periode: 'novembre 2026', statut: 'PAYE', year: 2026 }, row)
      ),
      listPlacesForStats: jest.fn(),
      listPaymentsForStats: jest.fn(),
    };
    auditTrail = fakeAuditTrail();
    service = new MarcheService(repository, fakeContribuables(contribuable()), auditTrail);
  });

  it.each([
    ['occupee', 'OCCUPEE'],
    ['disponible', 'LIBRE'],
    ['LIBRE', 'LIBRE'],
    ['inconnu', 'LIBRE'],
  ])('normalise le statut de place %s en %s', (input, expected) => {
    expect(normalizeMarketPlaceStatus(input)).toBe(expected);
  });

  describe('createPayment', () => {
    it('enregistre le paiement et le trace dans l’audit', async () => {
      repository.findPlaceById.mockResolvedValue(place());

      const paiement = await service.createPayment(agent, { placeId: 'place-1', periode: 'novembre 2026', montant: 5000 });

      expect(paiement).toMatchObject({ placeId: 'place-1', montant: 5000, statut: 'PAYE', place: { numero: 'A-01' } });
      expect(auditTrail.record).toHaveBeenCalledWith(agent, expect.objectContaining({
        action: 'Paiement marché',
        details: 'Paiement enregistré pour la place A-01 (5000 FCFA)',
      }));
    });

    it('encaisse le paiement en attente de la même période au lieu d’en créer un second', async () => {
      repository.findPlaceById.mockResolvedValue(place());
      repository.findPaymentsForPeriod.mockResolvedValue([{ id: 'paiement-attente', statut: 'EN_ATTENTE' }]);

      await service.createPayment(agent, { placeId: 'place-1', periode: 'novembre 2026', montant: 5000, reference: 'MRC-1' });

      expect(repository.settlePayment).toHaveBeenCalledWith('paiement-attente', expect.objectContaining({ montant: 5000, reference: 'MRC-1' }), expect.anything());
      expect(repository.createPayment).not.toHaveBeenCalled();
    });

    it('refuse d’encaisser deux fois la même période', async () => {
      repository.findPlaceById.mockResolvedValue(place());
      repository.findPaymentsForPeriod.mockResolvedValue([{ id: 'paiement-1', statut: 'PAYE' }]);

      await expect(service.createPayment(agent, { placeId: 'place-1', periode: 'novembre 2026', montant: 5000 })).rejects.toBeInstanceOf(
        ConflictError
      );
      expect(repository.createPayment).not.toHaveBeenCalled();
      expect(repository.settlePayment).not.toHaveBeenCalled();
    });

    it('ignore un paiement annulé de la même période', async () => {
      repository.findPlaceById.mockResolvedValue(place());
      repository.findPaymentsForPeriod.mockResolvedValue([{ id: 'paiement-annule', statut: 'ANNULE' }]);

      await service.createPayment(agent, { placeId: 'place-1', periode: 'novembre 2026', montant: 5000 });

      expect(repository.createPayment).toHaveBeenCalled();
    });

    it.each([0, -500])('refuse un montant de %s', async (montant) => {
      await expect(service.createPayment(agent, { placeId: 'place-1', periode: 'novembre 2026', montant })).rejects.toBeInstanceOf(
        ValidationError
      );
      expect(repository.createPayment).not.toHaveBeenCalled();
    });

    it('exige la place et la période', async () => {
      await expect(service.createPayment(agent, { montant: 5000 })).rejects.toBeInstanceOf(ValidationError);
    });

    it('signale une place introuvable sans rien enregistrer', async () => {
      repository.findPlaceById.mockResolvedValue(null);

      await expect(service.createPayment(agent, { placeId: 'x', periode: 'novembre 2026', montant: 5000 })).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(repository.createPayment).not.toHaveBeenCalled();
      expect(auditTrail.record).not.toHaveBeenCalled();
    });
  });

  describe('createPlace', () => {
    it('date l’attribution et reprend le téléphone de l’occupant', async () => {
      const created = await service.createPlace(agent, {
        numero: 'B-07',
        type: 'Boutique',
        zone: 'Zone B',
        occupantId: 'contrib-1',
        statut: 'occupee',
      });

      expect(created).toMatchObject({ numeroPlace: 'B-07', statut: 'OCCUPEE', occupant: 'Awa Diatta', telephone: '770001122' });
      expect(created.dateAttribution).not.toBeNull();
    });

    it('refuse un numéro déjà pris la même année', async () => {
      repository.findPlaceIdByNumero.mockResolvedValue('place-existante');

      await expect(service.createPlace(agent, { numero: 'A-01', type: 'Étal', zone: 'Zone A', year: 2026 })).rejects.toBeInstanceOf(
        ConflictError
      );
    });

    it('refuse un tarif négatif', async () => {
      await expect(service.createPlace(agent, { numero: 'A-02', type: 'Étal', zone: 'Zone A', tarif: -1 })).rejects.toBeInstanceOf(
        ValidationError
      );
    });

    it('refuse un occupant inconnu', async () => {
      await expect(
        service.createPlace(agent, { numero: 'A-02', type: 'Étal', zone: 'Zone A', occupantId: 'inconnu' })
      ).rejects.toThrow('Occupant introuvable.');
    });
  });

  describe('updatePlace', () => {
    it('efface activité, téléphone et date quand la place est libérée', async () => {
      repository.findPlaceById.mockResolvedValue(
        place({ occupantId: 'contrib-1', activite: 'Poissonnerie', telephone: '770001122', dateAttribution: new Date('2026-03-01'), statut: 'OCCUPEE' })
      );

      await service.updatePlace(agent, 'place-1', { occupantId: null, statut: 'LIBRE' });

      expect(repository.updatePlace.mock.calls[0][1]).toMatchObject({
        occupantId: null,
        activite: null,
        telephone: null,
        dateAttribution: null,
        statut: 'LIBRE',
      });
    });

    it('conserve la date d’attribution d’un occupant inchangé', async () => {
      const attribution = new Date('2026-03-01');
      repository.findPlaceById.mockResolvedValue(place({ occupantId: 'contrib-1', dateAttribution: attribution }));

      await service.updatePlace(agent, 'place-1', { tarif: 6000 });

      expect(repository.updatePlace.mock.calls[0][1]).toMatchObject({ dateAttribution: attribution, tarif: 6000 });
    });

    it('signale une place introuvable', async () => {
      repository.findPlaceById.mockResolvedValue(null);

      await expect(service.updatePlace(agent, 'x', {})).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it('calcule occupation, recettes et impayés', async () => {
    repository.listPlacesForStats.mockResolvedValue([
      { statut: 'OCCUPEE', occupantId: 'c1' },
      { statut: 'OCCUPEE', occupantId: 'c2' },
      { statut: 'LIBRE', occupantId: null },
    ]);
    repository.listPaymentsForStats.mockResolvedValue([
      { montant: 5000, statut: 'PAYE' },
      { montant: 3000, statut: 'EN_ATTENTE' },
      { montant: 7000, statut: 'ANNULE' },
    ]);

    await expect(service.stats(2026)).resolves.toEqual({
      placesTotales: 3,
      placesOccupees: 2,
      placesDisponibles: 1,
      recettesMois: 5000,
      tauxOccupation: 67,
      nouveauxCommercants: 2,
      recettesEnRetard: 3000,
    });
  });
});
