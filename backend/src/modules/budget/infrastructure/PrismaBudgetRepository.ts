import { randomUUID } from 'node:crypto';
import { db } from '../../../shared/infrastructure/prisma/transactionContext';
import type {
  BudgetLine,
  BudgetLineValues,
  BudgetRepository,
  BudgetRequest,
  BudgetRequestValues,
} from '../domain/Budget';

// Les montants sont des Decimal en base : convertis en nombres ici, sinon ils sortiraient en chaînes.
const LINE_COLUMNS = `"id", "code", "libelle", "description", "prevu"::float8 AS "prevu", "depense"::float8 AS "depense", "year", "createdAt", "updatedAt"`;
const REQUEST_COLUMNS = `"id", "service", "description", "montant"::float8 AS "montant", "statut", "motif", "year", "requestedById", "approvedById", "createdAt", "updatedAt"`;
const SQL_LIST_LINES = `SELECT ${LINE_COLUMNS} FROM "BudgetLine" WHERE "year" = $1 ORDER BY "code" ASC, "libelle" ASC`;
const SQL_FIND_LINE = `SELECT ${LINE_COLUMNS} FROM "BudgetLine" WHERE "id" = $1 LIMIT 1`;
const SQL_FIND_LINE_BY_CODE = `SELECT ${LINE_COLUMNS} FROM "BudgetLine" WHERE "code" = $1 AND "year" = $2 LIMIT 1`;
const SQL_CREATE_LINE = `INSERT INTO "BudgetLine" ("id", "code", "libelle", "description", "prevu", "depense", "year", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING ${LINE_COLUMNS}`;
const SQL_UPDATE_LINE = `UPDATE "BudgetLine" SET "code" = $2, "libelle" = $3, "description" = $4, "prevu" = $5, "depense" = $6, "year" = $7, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING ${LINE_COLUMNS}`;
const SQL_LIST_REQUESTS = `SELECT ${REQUEST_COLUMNS} FROM "BudgetRequest" WHERE "year" = $1 ORDER BY "createdAt" DESC`;
const SQL_FIND_REQUEST = `SELECT ${REQUEST_COLUMNS} FROM "BudgetRequest" WHERE "id" = $1 LIMIT 1`;
const SQL_CREATE_REQUEST = `INSERT INTO "BudgetRequest" ("id", "service", "description", "montant", "statut", "motif", "year", "requestedById", "approvedById", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING ${REQUEST_COLUMNS}`;
const SQL_UPDATE_REQUEST = `UPDATE "BudgetRequest" SET "service" = $2, "description" = $3, "montant" = $4, "statut" = $5, "motif" = $6, "approvedById" = $7, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING ${REQUEST_COLUMNS}`;

export class PrismaBudgetRepository implements BudgetRepository {
  listLines(year: number) {
    return db().$queryRawUnsafe<BudgetLine[]>(
      SQL_LIST_LINES,
      year
    );
  }

  async findLineById(id: string) {
    const [line] = await db().$queryRawUnsafe<BudgetLine[]>(SQL_FIND_LINE, id);
    return line || null;
  }

  async findLineByCode(code: string, year: number) {
    const [line] = await db().$queryRawUnsafe<BudgetLine[]>(
      SQL_FIND_LINE_BY_CODE,
      code,
      year
    );
    return line || null;
  }

  async createLine(values: BudgetLineValues) {
    const [line] = await db().$queryRawUnsafe<BudgetLine[]>(
      SQL_CREATE_LINE,
      randomUUID(),
      values.code,
      values.libelle,
      values.description,
      values.prevu,
      values.depense,
      values.year
    );
    return line;
  }

  async updateLine(id: string, values: BudgetLineValues) {
    const [line] = await db().$queryRawUnsafe<BudgetLine[]>(
      SQL_UPDATE_LINE,
      id,
      values.code,
      values.libelle,
      values.description,
      values.prevu,
      values.depense,
      values.year
    );
    return line;
  }

  async deleteLine(id: string) {
    await db().$executeRaw`DELETE FROM "BudgetLine" WHERE "id" = ${id}`;
  }

  listRequests(year: number) {
    return db().$queryRawUnsafe<BudgetRequest[]>(
      SQL_LIST_REQUESTS,
      year
    );
  }

  async findRequestById(id: string) {
    const [request] = await db().$queryRawUnsafe<BudgetRequest[]>(
      SQL_FIND_REQUEST,
      id
    );
    return request || null;
  }

  async createRequest(values: Omit<BudgetRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const [request] = await db().$queryRawUnsafe<BudgetRequest[]>(
      SQL_CREATE_REQUEST,
      randomUUID(),
      values.service,
      values.description,
      values.montant,
      values.statut,
      values.motif,
      values.year,
      values.requestedById,
      values.approvedById
    );
    return request;
  }

  async updateRequest(id: string, values: BudgetRequestValues) {
    const [request] = await db().$queryRawUnsafe<BudgetRequest[]>(
      SQL_UPDATE_REQUEST,
      id,
      values.service,
      values.description,
      values.montant,
      values.statut,
      values.motif,
      values.approvedById
    );
    return request;
  }
}
