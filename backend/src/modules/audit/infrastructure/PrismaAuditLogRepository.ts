import { db } from '../../../shared/infrastructure/prisma/transactionContext';
import type { AuditLog, AuditLogRepository } from '../domain/AuditLog';

export class PrismaAuditLogRepository implements AuditLogRepository {
  listByYear(year: number) {
    return db().$queryRawUnsafe<AuditLog[]>('SELECT * FROM "AuditLog" WHERE "year" = $1 ORDER BY "timestamp" DESC', year);
  }
}
