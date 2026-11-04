import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { agent, contribuable, fakeActorDirectory, fakeAuditTrail, fakeContribuables, fakeNumeroSequence } from '../../../shared/testing/ports';
import type { MotoPayment, MotoRegistration, MotoRepository } from '../domain/Moto';
import { MOTO_PENALITE_RETARD, MOTO_TARIF_MENSUEL, MotoService } from './MotoService';

function moto(overrides: Partial<MotoRegistration> = {}): MotoRegistration {
  return {
    id: 'moto-1',
    matricule: 'ZG-1234-A',
    marque: 'Jakarta',
    modele: 'JK125',
    annee: 2022,
    couleur: null,
    proprietaireId: 'contrib-1',
    conducteurId: 'contrib-1',
    permis: null,
    statut: 'ACTIVE',
    photo: null,
    enRetard: false,
    montantPenalite: MOTO_PENALITE_RETARD,
    prochainPaiement: null,
    dernierPaiement: null,
    year: 2026,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    proprietaireNom: 'Diatta',
    proprietairePrenom: 'Awa',
    proprietaireNin: '1988000000999',
    proprietaireTelephone: '770001122',
    conducteurNom: null,
    conducteurPrenom: null,
    conducteurNin: null,
    conducteurTelephone: null,
    ...overrides,
  };
}

function paymentFrom(values: { montant: number; reference: string | null }, row: MotoRegistration): MotoPayment {
  const { statut, ...rest } = row;
  return {
    ...rest,
    id: 'paiement-1',
    motoId: row.id,
    montant: values.montant,
    reference: values.reference,
    statut: 'PAYE',
    motoStatut: statut,
    datePaiement: new Date(),
    mois: 'novembre 2026',
    numeroRecu: 'MOTO-1',
    agent: 'Awa Badji',
  };
}

describe('MotoService', () => {
  let repository: jest.Mocked<MotoRepository>;
  let auditTrail: ReturnType<typeof fakeAuditTrail>;
  let service: MotoService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      findIdByMatricule: jest.fn().mockResolvedValue(null),
      findIdByPermis: jest.fn().mockResolvedValue(null),
      create: jest.fn(async (values, people) => moto({ ...values, ...people })),
      update: jest.fn(async (id, values, people) => moto({ id, ...values, ...people })),
      listForStats: jest.fn(),
      listPaymentAmounts: jest.fn(),
      listPayments: jest.fn(),
      recordPayment: jest.fn(async (values, row) => paymentFrom(values, row)),
    };
    auditTrail = fakeAuditTrail();
    service = new MotoService(repository, fakeContribuables(contribuable()), fakeActorDirectory(), auditTrail, fakeNumeroSequence());
  });

  describe('createPayment', () => {
    it('applique le tarif mensuel quand la moto est à jour', async () => {
      repository.findById.mockResolvedValue(moto());

      const paiement = await service.createPayment(agent, { motoId: 'moto-1' });

      expect(paiement.montant).toBe(MOTO_TARIF_MENSUEL);
      expect(repository.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({ motoId: 'moto-1', montant: MOTO_TARIF_MENSUEL, agent: 'Awa Badji' }),
        expect.objectContaining({ id: 'moto-1' })
      );
    });

    it('ajoute la pénalité de la moto quand elle est en retard', async () => {
      repository.findById.mockResolvedValue(moto({ enRetard: true, montantPenalite: 500 }));

      const paiement = await service.createPayment(agent, { motoId: 'moto-1' });

      expect(paiement.montant).toBe(MOTO_TARIF_MENSUEL + 500);
    });

    it('respecte un montant saisi explicitement', async () => {
      repository.findById.mockResolvedValue(moto({ enRetard: true }));

      const paiement = await service.createPayment(agent, { motoId: 'moto-1', montant: 3000 });

      expect(paiement.montant).toBe(3000);
    });

    it('fixe la prochaine échéance environ un mois plus tard', async () => {
      repository.findById.mockResolvedValue(moto());

      await service.createPayment(agent, { motoId: 'moto-1' });

      const { prochainPaiement, datePaiement } = repository.recordPayment.mock.calls[0][0];
      const jours = (prochainPaiement.getTime() - datePaiement.getTime()) / 86_400_000;
      expect(jours).toBeGreaterThanOrEqual(27);
      expect(jours).toBeLessThanOrEqual(32);
    });

    it('attribue lui-même le numéro de reçu, à la suite, et garde la référence fournie', async () => {
      repository.findById.mockResolvedValue(moto());

      await service.createPayment(agent, { motoId: 'moto-1', reference: ' REC-42 ', year: 2026 });
      await service.createPayment(agent, { motoId: 'moto-1', year: 2026 });

      expect(repository.recordPayment.mock.calls[0][0]).toMatchObject({ reference: 'REC-42', numeroRecu: 'MOTO-2026-00001' });
      expect(repository.recordPayment.mock.calls[1][0]).toMatchObject({ reference: null, numeroRecu: 'MOTO-2026-00002' });
    });

    it('refuse un montant négatif', async () => {
      repository.findById.mockResolvedValue(moto());

      await expect(service.createPayment(agent, { motoId: 'moto-1', montant: -10 })).rejects.toBeInstanceOf(ValidationError);
      expect(repository.recordPayment).not.toHaveBeenCalled();
    });

    it('exige une moto existante', async () => {
      await expect(service.createPayment(agent, {})).rejects.toBeInstanceOf(ValidationError);

      repository.findById.mockResolvedValue(null);
      await expect(service.createPayment(agent, { motoId: 'inconnue' })).rejects.toBeInstanceOf(NotFoundError);
      expect(repository.recordPayment).not.toHaveBeenCalled();
      expect(auditTrail.record).not.toHaveBeenCalled();
    });

    it('trace le paiement dans le journal d’audit', async () => {
      repository.findById.mockResolvedValue(moto());

      await service.createPayment(agent, { motoId: 'moto-1' });

      expect(auditTrail.record).toHaveBeenCalledWith(agent, {
        action: 'Paiement moto',
        module: 'Motos',
        details: `Paiement enregistré pour la moto ZG-1234-A (${MOTO_TARIF_MENSUEL} FCFA)`,
      });
    });
  });

  describe('create', () => {
    const input = { matricule: ' zg-9999-b ', marque: 'TVS', modele: 'Apache', proprietaireId: 'contrib-1' };

    it('normalise le matricule et prend le propriétaire comme conducteur par défaut', async () => {
      const created = await service.create(agent, input);

      expect(created.matricule).toBe('ZG-9999-B');
      expect(created.conducteurId).toBe('contrib-1');
      expect(created.enRetard).toBe(false);
      expect(created.montantPenalite).toBe(MOTO_PENALITE_RETARD);
      expect(auditTrail.record).toHaveBeenCalledTimes(1);
    });

    it('refuse un matricule déjà enregistré', async () => {
      repository.findIdByMatricule.mockResolvedValue('moto-existante');

      await expect(service.create(agent, input)).rejects.toBeInstanceOf(ConflictError);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuse un permis déjà enregistré', async () => {
      repository.findIdByPermis.mockResolvedValue('moto-existante');

      await expect(service.create(agent, { ...input, permis: 'P-1' })).rejects.toBeInstanceOf(ConflictError);
    });

    it('exige un propriétaire et un conducteur connus', async () => {
      await expect(service.create(agent, { ...input, proprietaireId: 'inconnu' })).rejects.toThrow('Propriétaire introuvable.');
      await expect(service.create(agent, { ...input, conducteurId: 'inconnu' })).rejects.toThrow('Conducteur introuvable.');
    });

    it('exige les champs obligatoires', async () => {
      await expect(service.create(agent, { marque: 'TVS' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('update', () => {
    it('autorise une moto à garder son propre matricule', async () => {
      repository.findById.mockResolvedValue(moto());
      repository.findIdByMatricule.mockResolvedValue('moto-1');

      await expect(service.update(agent, 'moto-1', { matricule: 'zg-1234-a', couleur: 'Rouge' })).resolves.toMatchObject({
        matricule: 'ZG-1234-A',
        couleur: 'Rouge',
      });
    });

    it('refuse de reprendre le matricule d’une autre moto', async () => {
      repository.findById.mockResolvedValue(moto());
      repository.findIdByMatricule.mockResolvedValue('moto-2');

      await expect(service.update(agent, 'moto-1', { matricule: 'ZG-0000-Z' })).rejects.toBeInstanceOf(ConflictError);
    });

    it('conserve les champs absents du payload', async () => {
      repository.findById.mockResolvedValue(moto({ couleur: 'Bleue', permis: 'P-7' }));

      await service.update(agent, 'moto-1', { statut: 'suspendue' });

      expect(repository.update.mock.calls[0][1]).toMatchObject({ couleur: 'Bleue', permis: 'P-7', statut: 'SUSPENDUE' });
    });

    it('signale une moto introuvable', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(agent, 'inconnue', {})).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('stats', () => {
    it('calcule recettes, taux de paiement et montants en retard', async () => {
      repository.listForStats.mockResolvedValue([
        { enRetard: true, statut: 'ACTIVE' },
        { enRetard: false, statut: 'ACTIVE' },
        { enRetard: false, statut: 'ACTIVE' },
        { enRetard: true, statut: 'ACTIVE' },
      ]);
      repository.listPaymentAmounts.mockResolvedValue([{ montant: 1000 }, { montant: 1250 }, { montant: 1000 }]);

      await expect(service.stats(2026)).resolves.toMatchObject({
        totalMotos: 4,
        enRetard: 2,
        paiementsMois: 3,
        recettesMois: 3250,
        tauxPaiement: 75,
        penalitesEnCours: 2 * MOTO_PENALITE_RETARD,
        montantEnRetard: 2 * (MOTO_TARIF_MENSUEL + MOTO_PENALITE_RETARD),
      });
    });

    it('renvoie un taux nul sans moto', async () => {
      repository.listForStats.mockResolvedValue([]);
      repository.listPaymentAmounts.mockResolvedValue([]);

      await expect(service.stats(2026)).resolves.toMatchObject({ totalMotos: 0, tauxPaiement: 0 });
    });
  });

  it('filtre la liste sur le nom du propriétaire et limite le nombre de résultats', async () => {
    repository.list.mockResolvedValue([
      moto({ id: 'a', matricule: 'A' }),
      moto({ id: 'b', matricule: 'B', proprietaireNom: 'Sané' }),
      moto({ id: 'c', matricule: 'C' }),
    ]);

    const result = await service.list(2026, 'diatta', 1);

    expect(result.map((item) => item.id)).toEqual(['a']);
  });
});
