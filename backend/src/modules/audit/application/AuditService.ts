import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { AuditLog, AuditLogRepository } from '../domain/AuditLog';

export type AuditListFilters = {
  page: number;
  limit: number;
  year: number;
  search: string;
  module: string;
  status: string;
};

const formatDate = (date: Date) => date.toLocaleDateString('fr-FR');
const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export class AuditService {
  constructor(
    private readonly repository: AuditLogRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async list(filters: AuditListFilters) {
    const { page, limit, year, search, module, status } = filters;
    const logs = await this.repository.listByYear(year);

    const normalizedSearch = search.toLowerCase();
    const filteredLogs = logs.filter((log) => {
      const matchesModule = !module || module === 'all' || log.module === module;
      const matchesStatus = !status || status === 'all' || log.status === status;
      const haystack = `${log.userName} ${log.action} ${log.details}`.toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesModule && matchesStatus && matchesSearch;
    });

    const total = filteredLogs.length;
    const countStatus = (value: string) => filteredLogs.filter((log) => log.status === value).length;

    return {
      logs: filteredLogs.slice((page - 1) * limit, page * limit).map((log) => this.toView(log)),
      stats: { total, success: countStatus('success'), warning: countStatus('warning'), error: countStatus('error') },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async seed(actor: Actor) {
    await this.auditTrail.record(actor, {
      action: 'Initialisation audit',
      module: 'Audit',
      details: 'Création d’une entrée de démonstration audit',
    });
  }

  async exportCsv(year: number) {
    const logs = await this.repository.listByYear(year);

    const header = 'date,heure,utilisateur,role,action,module,details,statut,ip\n';
    const body = logs
      .map((log) =>
        [
          formatDate(log.timestamp),
          formatTime(log.timestamp),
          log.userName,
          log.role,
          log.action,
          log.module,
          log.details,
          log.status,
          log.ipAddress || '',
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    return { filename: `audit-${year}.csv`, content: `${header}${body}\n` };
  }

  private toView(log: AuditLog) {
    return {
      id: log.id,
      date: formatDate(log.timestamp),
      time: formatTime(log.timestamp),
      timestamp: log.timestamp.toISOString(),
      user: log.userName,
      role: log.role,
      action: log.action,
      module: log.module,
      details: log.details,
      ipAddress: log.ipAddress,
      status: log.status as 'success' | 'warning' | 'error',
    };
  }
}
