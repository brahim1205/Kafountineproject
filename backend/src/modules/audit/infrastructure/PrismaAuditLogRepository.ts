import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuditLog, AuditLogRepository } from '../domain/AuditLog';

export class PrismaAuditLogRepository implements AuditLogRepository {
  listByYear(year: number) {
    return prisma.$queryRawUnsafe<AuditLog[]>('SELECT * FROM "AuditLog" WHERE "year" = $1 ORDER BY "timestamp" DESC', year);
  }
}
