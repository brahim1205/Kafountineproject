import { fakeAuditTrail } from '../../../shared/testing/ports';
import type { AuditLog, AuditLogRepository } from '../domain/AuditLog';
import { AuditService } from './AuditService';

const log: AuditLog = {
  id: 'log-1',
  userId: null,
  userName: 'Awa Badji',
  role: 'ADMIN',
  action: 'Paiement moto',
  module: 'Motos',
  details: 'Paiement enregistré',
  status: 'success',
  ipAddress: null,
  year: 2026,
  timestamp: new Date('2026-03-01T10:15:00Z'),
};

describe('AuditService.list', () => {
  const repository: jest.Mocked<AuditLogRepository> = { listByYear: jest.fn(), search: jest.fn() };
  const service = new AuditService(repository, fakeAuditTrail());

  beforeEach(() => {
    repository.search.mockResolvedValue({ logs: [log], total: 45, success: 40, warning: 4, error: 1 });
  });

  it('traduit page et filtres en critères pour le dépôt', async () => {
    await service.list({ page: 3, limit: 20, year: 2026, search: 'moto', module: 'Motos', status: 'success' });

    expect(repository.search).toHaveBeenCalledWith({
      year: 2026,
      module: 'Motos',
      status: 'success',
      search: 'moto',
      offset: 40,
      limit: 20,
    });
  });

  it('ne filtre pas sur « all » ni sur une recherche vide', async () => {
    await service.list({ page: 1, limit: 20, year: 2026, search: '', module: 'all', status: 'all' });

    expect(repository.search).toHaveBeenCalledWith(expect.objectContaining({ module: null, status: null, search: null }));
  });

  it('renvoie les compteurs et la pagination calculés en base', async () => {
    const result = await service.list({ page: 1, limit: 20, year: 2026, search: '', module: '', status: '' });

    expect(result.stats).toEqual({ total: 45, success: 40, warning: 4, error: 1 });
    expect(result.pagination).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
    expect(result.logs[0]).toMatchObject({ id: 'log-1', user: 'Awa Badji', status: 'success' });
  });
});
