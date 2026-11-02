import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type {
  BudgetLine,
  BudgetLineValues,
  BudgetRepository,
  BudgetRequest,
  BudgetRequestValues,
} from '../domain/Budget';

export class PrismaBudgetRepository implements BudgetRepository {
  listLines(year: number) {
    return prisma.$queryRawUnsafe<BudgetLine[]>(
      'SELECT * FROM "BudgetLine" WHERE "year" = $1 ORDER BY "code" ASC, "libelle" ASC',
      year
    );
  }

  async findLineById(id: string) {
    const [line] = await prisma.$queryRawUnsafe<BudgetLine[]>('SELECT * FROM "BudgetLine" WHERE "id" = $1 LIMIT 1', id);
    return line || null;
  }

  async findLineByCode(code: string, year: number) {
    const [line] = await prisma.$queryRawUnsafe<BudgetLine[]>(
      'SELECT * FROM "BudgetLine" WHERE "code" = $1 AND "year" = $2 LIMIT 1',
      code,
      year
    );
    return line || null;
  }

  async createLine(values: BudgetLineValues) {
    const [line] = await prisma.$queryRawUnsafe<BudgetLine[]>(
      'INSERT INTO "BudgetLine" ("id", "code", "libelle", "description", "prevu", "depense", "year", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
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
    const [line] = await prisma.$queryRawUnsafe<BudgetLine[]>(
      'UPDATE "BudgetLine" SET "code" = $2, "libelle" = $3, "description" = $4, "prevu" = $5, "depense" = $6, "year" = $7, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING *',
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
    await prisma.$executeRaw`DELETE FROM "BudgetLine" WHERE "id" = ${id}`;
  }

  listRequests(year: number) {
    return prisma.$queryRawUnsafe<BudgetRequest[]>(
      'SELECT * FROM "BudgetRequest" WHERE "year" = $1 ORDER BY "createdAt" DESC',
      year
    );
  }

  async findRequestById(id: string) {
    const [request] = await prisma.$queryRawUnsafe<BudgetRequest[]>(
      'SELECT * FROM "BudgetRequest" WHERE "id" = $1 LIMIT 1',
      id
    );
    return request || null;
  }

  async createRequest(values: Omit<BudgetRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const [request] = await prisma.$queryRawUnsafe<BudgetRequest[]>(
      'INSERT INTO "BudgetRequest" ("id", "service", "description", "montant", "statut", "motif", "year", "requestedById", "approvedById", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
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
    const [request] = await prisma.$queryRawUnsafe<BudgetRequest[]>(
      'UPDATE "BudgetRequest" SET "service" = $2, "description" = $3, "montant" = $4, "statut" = $5, "motif" = $6, "approvedById" = $7, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING *',
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
