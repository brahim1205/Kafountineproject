import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { PlaceholderSupportService } from './PlaceholderSupportService';

type AuditLogRow = {
  id: string;
  userId: string | null;
  userName: string;
  role: string;
  action: string;
  module: string;
  details: string;
  status: string;
  ipAddress: string | null;
  year: number;
  timestamp: Date;
};

export class PlaceholderAuditService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async listAudit(params: {
    page: number;
    limit: number;
    year: number;
    search: string;
    moduleFilter: string;
    statusFilter: string;
  }) {
    const { page, limit, year, search, moduleFilter, statusFilter } = params;
    const logs = await prisma.$queryRawUnsafe<AuditLogRow[]>(
      'SELECT * FROM "AuditLog" WHERE "year" = $1 ORDER BY "timestamp" DESC',
      year
    );

    const normalizedSearch = search.toLowerCase();
    const filteredLogs = logs.filter((log) => {
      const matchesModule = !moduleFilter || moduleFilter === 'all' || log.module === moduleFilter;
      const matchesStatus = !statusFilter || statusFilter === 'all' || log.status === statusFilter;
      const haystack = `${log.userName} ${log.action} ${log.details}`.toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesModule && matchesStatus && matchesSearch;
    });

    const total = filteredLogs.length;
    const success = filteredLogs.filter((log) => log.status === 'success').length;
    const warning = filteredLogs.filter((log) => log.status === 'warning').length;
    const error = filteredLogs.filter((log) => log.status === 'error').length;
    const paginated = filteredLogs.slice((page - 1) * limit, page * limit);

    return {
      logs: paginated.map((log) => ({
        id: log.id,
        date: log.timestamp.toLocaleDateString('fr-FR'),
        time: log.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: log.timestamp.toISOString(),
        user: log.userName,
        role: log.role,
        action: log.action,
        module: log.module,
        details: log.details,
        ipAddress: log.ipAddress,
        status: log.status as 'success' | 'warning' | 'error',
      })),
      stats: { total, success, warning, error },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async seedAudit(req: AuthRequest) {
    await this.supportService.writeAuditLog(req, {
      action: 'Initialisation audit',
      module: 'Audit',
      details: 'Création d’une entrée de démonstration audit',
    });
  }

  async exportAuditCsv(year: number) {
    const logs = await prisma.$queryRawUnsafe<AuditLogRow[]>(
      'SELECT * FROM "AuditLog" WHERE "year" = $1 ORDER BY "timestamp" DESC',
      year
    );

    const header = 'date,heure,utilisateur,role,action,module,details,statut,ip\n';
    const body = logs
      .map((log) => {
        const fields = [
          log.timestamp.toLocaleDateString('fr-FR'),
          log.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          log.userName,
          log.role,
          log.action,
          log.module,
          log.details,
          log.status,
          log.ipAddress || '',
        ];
        return fields.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
      })
      .join('\n');

    return {
      filename: `audit-${year}.csv`,
      content: `${header}${body}\n`,
    };
  }
}
