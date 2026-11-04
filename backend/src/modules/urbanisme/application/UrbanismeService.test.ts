import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { admin, agent, contribuable, fakeAuditTrail, fakeContribuables } from '../../../shared/testing/ports';
import type { UrbanismeCase, UrbanismeRepository } from '../domain/Urbanisme';
import { UrbanismeService, normalizeUrbanismeStatus, resolveUrbanismeType } from './UrbanismeService';

function dossier(overrides: Partial<UrbanismeCase> = {}): UrbanismeCase {
  return {
    id: 'dossier-1',
    numero: 'URB-2026-00001',
    contribuableId: 'contrib-1',
    agentId: 'user-agent',
    type: 'permis-construire',
    description: null,
    surface: 120,
    localisation: 'Abéné',
    nature: 'habitation',
    montant: 600000,
    statut: 'EN_ATTENTE',
    year: 2026,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    contribuableNom: 'Diatta',
    contribuablePrenom: 'Awa',
    contribuableNin: '1988000000999',
    contribuableTelephone: '770001122',
    contribuableAdresse: 'Kafountine',
    agentNom: null,
    agentPrenom: null,
    ...overrides,
  };
}

describe('UrbanismeService', () => {
  let repository: jest.Mocked<UrbanismeRepository>;
  let auditTrail: ReturnType<typeof fakeAuditTrail>;
  let service: UrbanismeService;

  beforeEach(() => {
    repository = {
      search: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(async (values, display) => dossier({ ...values, ...display })),
      update: jest.fn(async (id, values, display) => dossier({ ...display, id, ...values })),
      delete: jest.fn().mockResolvedValue(undefined),
      listForStats: jest.fn(),
    };
    auditTrail = fakeAuditTrail();
    service = new UrbanismeService(repository, fakeContribuables(contribuable()), auditTrail);
  });

  it('résout les libellés de type vers le catalogue', () => {
    expect(resolveUrbanismeType('Permis de construire')).toMatchObject({ id: 'permis-construire', tarif: 5000, unite: 'm²' });
    expect(resolveUrbanismeType('titre-foncier')).toMatchObject({ id: 'titre-foncier', tarif: 10000 });
    expect(resolveUrbanismeType('Bornage')).toMatchObject({ id: 'bornage', nom: 'Bornage', tarif: 2500 });
  });

  it('ramène un statut inconnu à EN_ATTENTE', () => {
    expect(normalizeUrbanismeStatus('valide')).toBe('VALIDE');
    expect(normalizeUrbanismeStatus('archivé')).toBe('EN_ATTENTE');
  });

  describe('create — calcul des droits', () => {
    it('facture un permis de construire au m²', async () => {
      const created = await service.create(agent, { contribuableId: 'contrib-1', type: 'permis-construire', surface: 120 });

      expect(created.montant).toBe(5000 * 120);
    });

    it('facture au moins 1 m² quand la surface est absente ou nulle', async () => {
      await expect(service.create(agent, { contribuableId: 'contrib-1', type: 'permis-construire' })).resolves.toMatchObject({
        montant: 5000,
      });
      await expect(service.create(agent, { contribuableId: 'contrib-1', type: 'permis-construire', surface: 0 })).resolves.toMatchObject({
        montant: 5000,
      });
    });

    it('applique le forfait des types facturés au dossier, quelle que soit la surface', async () => {
      const created = await service.create(agent, { contribuableId: 'contrib-1', type: 'certificat-conformite', surface: 300 });

      expect(created.montant).toBe(2000);
    });

    it('respecte un montant saisi explicitement', async () => {
      const created = await service.create(agent, { contribuableId: 'contrib-1', type: 'permis-construire', surface: 120, montant: 0 });

      expect(created.montant).toBe(0);
    });

    it.each([
      [{ surface: -5 }, 'surface'],
      [{ montant: -1 }, 'montant'],
    ])('refuse une valeur négative (%o)', async (extra, champ) => {
      await expect(service.create(agent, { contribuableId: 'contrib-1', type: 'permis-construire', ...extra })).rejects.toThrow(
        new RegExp(champ)
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('create — dossier', () => {
    it('met le dossier d’un agent en attente et celui d’un admin directement validé', async () => {
      await expect(service.create(agent, { contribuableId: 'contrib-1', type: 'titre-foncier' })).resolves.toMatchObject({
        statut: 'EN_ATTENTE',
      });
      await expect(service.create(admin, { contribuableId: 'contrib-1', type: 'titre-foncier' })).resolves.toMatchObject({
        statut: 'VALIDE',
      });
    });

    it('génère un numéro URB-année-xxxxx et le reprend dans l’audit', async () => {
      const created = await service.create(agent, { contribuableId: 'contrib-1', type: 'titre-foncier' });

      expect(created.numero).toMatch(new RegExp(`^URB-${new Date().getFullYear()}-\\d{5}$`));
      expect(auditTrail.record).toHaveBeenCalledWith(agent, expect.objectContaining({
        details: `Dossier ${created.numero} créé (Titre foncier)`,
      }));
    });

    it('exige un contribuable connu et un type', async () => {
      await expect(service.create(agent, { contribuableId: 'contrib-1' })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.create(agent, { contribuableId: 'inconnu', type: 'titre-foncier' })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('update', () => {
    it('conserve les champs absents et trace un rejet en avertissement', async () => {
      repository.findById.mockResolvedValue(dossier());

      await service.update(agent, 'dossier-1', { statut: 'rejete' });

      expect(repository.update.mock.calls[0][1]).toMatchObject({ surface: 120, montant: 600000, localisation: 'Abéné', statut: 'REJETE' });
      expect(auditTrail.record).toHaveBeenCalledWith(agent, expect.objectContaining({ status: 'warning' }));
    });

    it('signale un dossier introuvable', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(agent, 'x', {})).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it('supprime un dossier existant et trace la suppression', async () => {
    repository.findById.mockResolvedValue(dossier());

    await service.delete(admin, 'dossier-1');

    expect(repository.delete).toHaveBeenCalledWith('dossier-1');
    expect(auditTrail.record).toHaveBeenCalledWith(admin, expect.objectContaining({ action: 'Suppression dossier urbanisme' }));
  });

  it('délègue filtrage et pagination au dépôt', async () => {
    repository.search.mockResolvedValue({ rows: [dossier({ id: '4', statut: 'VALIDE' })], total: 3 });

    const result = await service.list({ page: 2, limit: 2, year: 2026, statut: 'VALIDE', type: '' });

    expect(repository.search).toHaveBeenCalledWith({ year: 2026, statut: 'VALIDE', type: null, offset: 2, limit: 2 });
    expect(result.total).toBe(3);
    expect(result.data.map((item) => item.id)).toEqual(['4']);
  });

  it('additionne les droits de tous les dossiers dans les statistiques', async () => {
    repository.listForStats.mockResolvedValue([
      { statut: 'VALIDE', montant: 600000 },
      { statut: 'EN_ATTENTE', montant: 2500 },
      { statut: 'REJETE', montant: 2000 },
    ]);

    await expect(service.stats(2026)).resolves.toMatchObject({ total: 3, valide: 1, enAttente: 1, rejete: 1, montantTotal: 604500 });
  });
});
