import { NotFoundError } from '../../../shared/errors/AppError';
import { agent, fakeAuditTrail } from '../../../shared/testing/ports';
import type { Fisherman, QuaiPecheRepository, RefrigeratedTruck, ShippingExpedition } from '../domain/QuaiPeche';
import { QuaiPecheService } from './QuaiPecheService';

const dates = { createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };

function pecheur(overrides: Partial<Fisherman> = {}): Fisherman {
  return {
    id: 'pecheur-1',
    nom: 'Sané',
    prenom: 'Lamine',
    telephone: null,
    nin: null,
    adresse: null,
    statut: 'ACTIF',
    year: 2026,
    embarcationsCount: 0,
    commissionsCount: 0,
    ...dates,
    ...overrides,
  };
}

function camion(overrides: Partial<RefrigeratedTruck> = {}): RefrigeratedTruck {
  return {
    id: 'camion-1',
    immatriculation: 'ZG-4242-E',
    marque: 'Isuzu',
    modele: null,
    capacite: 8000,
    chauffeur: 'Lamine',
    telephone: null,
    statut: 'ACTIF',
    year: 2026,
    expeditionsCount: 0,
    ...dates,
    ...overrides,
  };
}

function expedition(overrides: Partial<ShippingExpedition> = {}): ShippingExpedition {
  return {
    id: 'exp-1',
    numero: 'EXP-2026-00001',
    date: new Date('2026-02-01'),
    poids: 1500,
    destination: 'Dakar',
    montant: 45000,
    statut: 'PLANIFIEE',
    observations: null,
    camionId: 'camion-1',
    year: 2026,
    camionImmatriculation: 'ZG-4242-E',
    camionMarque: 'Isuzu',
    camionModele: null,
    camionCapacite: 8000,
    camionChauffeur: 'Lamine',
    camionTelephone: null,
    camionStatut: 'ACTIF',
    ...dates,
    ...overrides,
  };
}

describe('QuaiPecheService', () => {
  let repository: jest.Mocked<QuaiPecheRepository>;
  let auditTrail: ReturnType<typeof fakeAuditTrail>;
  let service: QuaiPecheService;

  beforeEach(() => {
    repository = {
      listFishermen: jest.fn(),
      findFisherman: jest.fn().mockResolvedValue(null),
      createFisherman: jest.fn(async (values) => pecheur(values)),
      updateFisherman: jest.fn(async (id, values) => pecheur({ id, ...values })),
      listBoats: jest.fn(),
      findBoat: jest.fn().mockResolvedValue(null),
      createBoat: jest.fn(),
      updateBoat: jest.fn(),
      listCommissions: jest.fn(),
      findCommission: jest.fn().mockResolvedValue(null),
      createCommission: jest.fn(),
      updateCommission: jest.fn(),
      listTrucks: jest.fn(),
      findTruck: jest.fn().mockResolvedValue(null),
      createTruck: jest.fn(async (values) => camion(values)),
      updateTruck: jest.fn(async (id, values) => camion({ id, ...values })),
      listExpeditions: jest.fn(),
      findExpedition: jest.fn().mockResolvedValue(null),
      createExpedition: jest.fn(async (values, truck) =>
        expedition({ ...values, camionId: truck.id, camionImmatriculation: truck.immatriculation })
      ),
      updateExpedition: jest.fn(async (id, values, current) => expedition({ ...current, id, ...values })),
      delete: jest.fn(),
      listCommissionWeights: jest.fn(),
      countActiveFishermen: jest.fn(),
      countBoats: jest.fn(),
    };
    auditTrail = fakeAuditTrail();
    service = new QuaiPecheService(repository, auditTrail);
  });

  describe('expéditions', () => {
    it('rattache l’expédition au camion avec un numéro EXP généré', async () => {
      repository.findTruck.mockResolvedValue(camion());

      const created = await service.create(agent, 'expeditions', { camionId: 'camion-1', poids: '1500', montant: '45000', year: 2026 });

      expect(created).toMatchObject({ poids: 1500, montant: 45000, statut: 'PLANIFIEE', camion: { immatriculation: 'ZG-4242-E' } });
      expect(created).toHaveProperty('numero', expect.stringMatching(/^EXP-2026-\d{5}$/));
      expect(auditTrail.record).toHaveBeenCalledWith(agent, expect.objectContaining({ module: 'Quai de pêche', status: 'success' }));
    });

    it('refuse une expédition vers un camion inconnu', async () => {
      await expect(service.create(agent, 'expeditions', { camionId: 'inconnu' })).rejects.toThrow('Camion introuvable.');
      expect(repository.createExpedition).not.toHaveBeenCalled();
    });

    it('ne modifie que le statut lors d’un changement de statut', async () => {
      repository.findExpedition.mockResolvedValue(expedition());

      const updated = await service.update(agent, 'expeditions', 'exp-1', { statut: 'en_cours' });

      expect(repository.updateExpedition.mock.calls[0][1]).toEqual({
        poids: 1500,
        destination: 'Dakar',
        montant: 45000,
        statut: 'EN_COURS',
        observations: null,
      });
      expect(updated.statut).toBe('EN_COURS');
    });
  });

  describe('camions', () => {
    it('met l’immatriculation en majuscules et active le camion par défaut', async () => {
      const created = await service.create(agent, 'camions', { immatriculation: 'zg 4242 e', marque: 'Isuzu' });

      expect(created).toMatchObject({ immatriculation: 'ZG 4242 E', statut: 'ACTIF' });
    });

    it('conserve les champs absents lors d’une mise à jour partielle', async () => {
      repository.findTruck.mockResolvedValue(camion({ chauffeur: 'Lamine', capacite: 8000 }));

      await service.update(agent, 'camions', 'camion-1', { statut: 'maintenance' });

      expect(repository.updateTruck.mock.calls[0][1]).toMatchObject({ chauffeur: 'Lamine', capacite: 8000, statut: 'MAINTENANCE' });
    });
  });

  it('refuse une commission pour un pêcheur inconnu', async () => {
    await expect(service.create(agent, 'commissions', { pecheurId: 'inconnu', poids: 10 })).rejects.toThrow('Pêcheur introuvable.');
  });

  it.each([
    ['pecheurs', 'Pêcheur introuvable.'],
    ['embarcations', 'Embarcation introuvable.'],
    ['camions', 'Camion introuvable.'],
  ] as const)('renvoie une erreur 404 pour un %s inconnu', async (collection, message) => {
    await expect(service.get(collection, 'inconnu')).rejects.toThrow(new NotFoundError(message));
  });

  describe('delete', () => {
    it('trace la suppression en avertissement', async () => {
      repository.delete.mockResolvedValue(true);

      await service.delete(agent, 'camions', 'camion-1');

      expect(auditTrail.record).toHaveBeenCalledWith(agent, expect.objectContaining({ status: 'warning' }));
    });

    it('signale une ressource déjà absente sans rien tracer', async () => {
      repository.delete.mockResolvedValue(false);

      await expect(service.delete(agent, 'expeditions', 'x')).rejects.toThrow('Expédition introuvable.');
      expect(auditTrail.record).not.toHaveBeenCalled();
    });
  });

  it('agrège poids et commissions en attente', async () => {
    repository.listCommissionWeights.mockResolvedValue([
      { poids: 120, statut: 'ENREGISTREE' },
      { poids: 80, statut: 'VALIDEE' },
    ]);
    repository.countActiveFishermen.mockResolvedValue(12);
    repository.countBoats.mockResolvedValue(5);

    await expect(service.stats(2026)).resolves.toEqual({
      totalCommissions: 2,
      totalPoids: 200,
      commissionsEnAttente: 1,
      totalPecheurs: 12,
      totalEmbarcations: 5,
    });
  });
});
