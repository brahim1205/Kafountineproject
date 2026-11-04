import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { admin, agent, fakeAuditTrail } from '../../../shared/testing/ports';
import type { BudgetLine, BudgetRepository, BudgetRequest } from '../domain/Budget';
import { BudgetService } from './BudgetService';

function line(overrides: Partial<BudgetLine> = {}): BudgetLine {
  return {
    id: 'ligne-1',
    code: 'FONC-01',
    libelle: 'Fonctionnement',
    description: null,
    prevu: 1_000_000,
    depense: 250_000,
    year: 2026,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function request(overrides: Partial<BudgetRequest> = {}): BudgetRequest {
  return {
    id: 'demande-1',
    service: 'Voirie',
    description: 'Réfection de la piste',
    montant: 150_000,
    statut: 'EN_ATTENTE',
    motif: null,
    year: 2026,
    requestedById: 'user-agent',
    approvedById: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('BudgetService', () => {
  let repository: jest.Mocked<BudgetRepository>;
  let auditTrail: ReturnType<typeof fakeAuditTrail>;
  let service: BudgetService;

  beforeEach(() => {
    repository = {
      listLines: jest.fn(),
      findLineById: jest.fn(),
      findLineByCode: jest.fn().mockResolvedValue(null),
      createLine: jest.fn(async (values) => line(values)),
      updateLine: jest.fn(async (id, values) => line({ id, ...values })),
      deleteLine: jest.fn().mockResolvedValue(undefined),
      listRequests: jest.fn(),
      findRequestById: jest.fn(),
      createRequest: jest.fn(async (values) => request(values)),
      updateRequest: jest.fn(async (id, values) => request({ id, ...values })),
    };
    auditTrail = fakeAuditTrail();
    service = new BudgetService(repository, auditTrail);
  });

  describe('lignes budgétaires', () => {
    it('normalise le code et trace la création', async () => {
      const created = await service.createLine(admin, { code: ' fonc-02 ', libelle: 'Carburant', prevu: 500_000, year: 2026 });

      expect(created).toMatchObject({ code: 'FONC-02', prevu: 500_000, depense: 0 });
      expect(auditTrail.record).toHaveBeenCalledTimes(1);
    });

    it('refuse un code déjà utilisé la même année', async () => {
      repository.findLineByCode.mockResolvedValue(line());

      await expect(service.createLine(admin, { code: 'FONC-01', libelle: 'Doublon', year: 2026 })).rejects.toBeInstanceOf(ConflictError);
    });

    it.each([{ prevu: -1 }, { depense: -1 }])('refuse un montant négatif (%o)', async (montants) => {
      await expect(service.createLine(admin, { code: 'X', libelle: 'X', ...montants })).rejects.toBeInstanceOf(ValidationError);
      expect(repository.createLine).not.toHaveBeenCalled();
    });

    it('autorise une ligne à garder son code en mise à jour', async () => {
      repository.findLineById.mockResolvedValue(line());
      repository.findLineByCode.mockResolvedValue(line());

      await expect(service.updateLine(admin, 'ligne-1', { depense: 300_000 })).resolves.toMatchObject({ depense: 300_000, prevu: 1_000_000 });
    });

    it('refuse de reprendre le code d’une autre ligne', async () => {
      repository.findLineById.mockResolvedValue(line());
      repository.findLineByCode.mockResolvedValue(line({ id: 'ligne-2', code: 'INV-01' }));

      await expect(service.updateLine(admin, 'ligne-1', { code: 'inv-01' })).rejects.toBeInstanceOf(ConflictError);
    });

    it('signale une ligne introuvable à la suppression', async () => {
      repository.findLineById.mockResolvedValue(null);

      await expect(service.deleteLine(admin, 'x')).rejects.toBeInstanceOf(NotFoundError);
      expect(repository.deleteLine).not.toHaveBeenCalled();
    });
  });

  describe('demandes budgétaires', () => {
    it('crée la demande en attente au nom du demandeur', async () => {
      await service.createRequest(agent, { service: 'Voirie', description: 'Piste', montant: 150_000 });

      expect(repository.createRequest).toHaveBeenCalledWith(expect.objectContaining({
        statut: 'EN_ATTENTE',
        requestedById: 'user-agent',
        approvedById: null,
      }));
    });

    it.each([0, -100])('refuse un montant de %s', async (montant) => {
      await expect(service.createRequest(agent, { service: 'Voirie', description: 'Piste', montant })).rejects.toBeInstanceOf(
        ValidationError
      );
    });

    it('enregistre l’auteur de la décision quand la demande est approuvée', async () => {
      repository.findRequestById.mockResolvedValue(request());

      await service.updateRequest(admin, 'demande-1', { statut: 'approuve' });

      expect(repository.updateRequest.mock.calls[0][1]).toMatchObject({ statut: 'APPROUVE', approvedById: 'user-admin', montant: 150_000 });
    });

    it('refuse la décision à un autre rôle que l’administration', async () => {
      repository.findRequestById.mockResolvedValue(request());
      const finances = { userId: 'user-finances', role: 'SERVICE_FINANCES', ipAddress: '127.0.0.1' };

      await expect(service.updateRequest(finances, 'demande-1', { statut: 'APPROUVE' })).rejects.toBeInstanceOf(ForbiddenError);
      await expect(service.updateRequest(agent, 'demande-1', { statut: 'REJETE' })).rejects.toBeInstanceOf(ForbiddenError);
      expect(repository.updateRequest).not.toHaveBeenCalled();
    });

    it('refuse un statut inconnu et la modification du montant après décision', async () => {
      repository.findRequestById.mockResolvedValue(request());
      await expect(service.updateRequest(admin, 'demande-1', { statut: 'PAYE' })).rejects.toBeInstanceOf(ValidationError);

      repository.findRequestById.mockResolvedValue(request({ statut: 'APPROUVE', approvedById: 'user-admin' }));
      await expect(service.updateRequest(admin, 'demande-1', { montant: 999_999 })).rejects.toBeInstanceOf(ValidationError);
    });

    it('ne change pas l’auteur de la décision pour une simple modification', async () => {
      repository.findRequestById.mockResolvedValue(request({ statut: 'APPROUVE', approvedById: 'user-admin' }));

      await service.updateRequest(agent, 'demande-1', { motif: 'Précision' });

      expect(repository.updateRequest.mock.calls[0][1]).toMatchObject({ approvedById: 'user-admin', motif: 'Précision' });
    });
  });

  it('calcule le taux d’exécution et compte les demandes par statut', async () => {
    repository.listLines.mockResolvedValue([line({ prevu: 1_000_000, depense: 250_000 }), line({ prevu: 3_000_000, depense: 1_000_000 })]);
    repository.listRequests.mockResolvedValue([
      request({ statut: 'EN_ATTENTE' }),
      request({ statut: 'APPROUVE' }),
      request({ statut: 'APPROUVE' }),
      request({ statut: 'REJETE' }),
    ]);

    await expect(service.getStats(2026)).resolves.toEqual({
      totalPrevu: 4_000_000,
      totalDepense: 1_250_000,
      totalReste: 2_750_000,
      tauxExecution: 31,
      nombreLignes: 2,
      demandesEnAttente: 1,
      demandesApprouvees: 2,
      demandesRejetees: 1,
    });
  });
});
