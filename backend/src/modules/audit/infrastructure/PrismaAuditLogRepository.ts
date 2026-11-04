import { db } from '../../../shared/infrastructure/prisma/transactionContext';
import type { AuditLog, AuditLogCriteria, AuditLogPage, AuditLogRepository } from '../domain/AuditLog';

// $1 année, $2 module, $3 statut, $4 motif ILIKE (null = pas de filtre).
const SQL_FILTER = `
  WHERE "year" = $1
    AND ($2::text IS NULL OR "module" = $2)
    AND ($3::text IS NULL OR "status" = $3)
    AND ($4::text IS NULL OR ("userName" || ' ' || "action" || ' ' || "details") ILIKE $4 ESCAPE '\\')`;

const SQL_SEARCH_PAGE = `SELECT * FROM "AuditLog" ${SQL_FILTER} ORDER BY "timestamp" DESC, "id" DESC OFFSET $5 LIMIT $6`;

const SQL_SEARCH_COUNTS = `
  SELECT
    COUNT(*)::int AS "total",
    COUNT(*) FILTER (WHERE "status" = 'success')::int AS "success",
    COUNT(*) FILTER (WHERE "status" = 'warning')::int AS "warning",
    COUNT(*) FILTER (WHERE "status" = 'error')::int AS "error"
  FROM "AuditLog" ${SQL_FILTER}`;

/** Motif ILIKE « contient », en neutralisant les jokers saisis par l'utilisateur. */
const containsPattern = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

export class PrismaAuditLogRepository implements AuditLogRepository {
  listByYear(year: number) {
    return db().$queryRawUnsafe<AuditLog[]>('SELECT * FROM "AuditLog" WHERE "year" = $1 ORDER BY "timestamp" DESC, "id" DESC', year);
  }

  async search(criteria: AuditLogCriteria): Promise<AuditLogPage> {
    const filter = [criteria.year, criteria.module, criteria.status, criteria.search ? containsPattern(criteria.search) : null];
    const [logs, [counts]] = await Promise.all([
      db().$queryRawUnsafe<AuditLog[]>(SQL_SEARCH_PAGE, ...filter, criteria.offset, criteria.limit),
      db().$queryRawUnsafe<Array<Omit<AuditLogPage, 'logs'>>>(SQL_SEARCH_COUNTS, ...filter),
    ]);
    return { logs, ...counts };
  }
}
