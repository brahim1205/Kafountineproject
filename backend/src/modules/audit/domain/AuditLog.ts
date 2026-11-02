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

export interface AuditLogRepository {
  listByYear(year: number): Promise<AuditLog[]>;
}
