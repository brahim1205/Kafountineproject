export type AuditLog = {
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

export type AuditLogCriteria = {
  year: number;
  /** null : tous les modules / statuts, pas de recherche. */
  module: string | null;
  status: string | null;
  search: string | null;
  offset: number;
  limit: number;
};

export type AuditLogPage = {
  logs: AuditLog[];
  total: number;
  success: number;
  warning: number;
  error: number;
};

export interface AuditLogRepository {
  listByYear(year: number): Promise<AuditLog[]>;
  /** Filtre, compte et pagine en base : le journal grossit sans limite. */
  search(criteria: AuditLogCriteria): Promise<AuditLogPage>;
}
