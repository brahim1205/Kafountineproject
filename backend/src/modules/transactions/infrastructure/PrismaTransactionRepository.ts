import type { Prisma } from '@prisma/client';
import type { NumeroSequence } from '../../../shared/domain/NumeroSequence';
import { PrismaNumeroSequence } from '../../../shared/infrastructure/prisma/PrismaNumeroSequence';
import { db, inTransaction } from '../../../shared/infrastructure/prisma/transactionContext';
import type {
  CreateTransactionPayload,
  DateRange,
  TransactionCriteria,
  TransactionFilters,
  TransactionRepository,
} from '../domain/TransactionRepository';

const DAY_MS = 24 * 60 * 60 * 1000;

/** « 2026-11-04 » → minuit UTC (heure du Sénégal) ; null si la date est invalide. */
function parseDay(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly numeros: NumeroSequence = new PrismaNumeroSequence()) {}

  async search(filters: TransactionFilters) {
    const transactions = await db().transaction.findMany({
      where: this.buildWhere(filters),
      include: { contribuable: true, agent: true },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    });
    return transactions.map((transaction) => this.mapTransaction(transaction));
  }

  async count(filters: TransactionFilters) {
    return db().transaction.count({
      where: this.buildWhere(filters),
    });
  }

  async countByYear(year: number) {
    return db().transaction.count({ where: { year } });
  }

  async create(payload: CreateTransactionPayload) {
    return db().transaction.create({
      data: {
        ...payload,
        tarifUnitaire: payload.montant,
      },
    });
  }

  async createWithAtomicNumero(payload: Omit<CreateTransactionPayload, 'numero'>) {
    return inTransaction(async (tx) => {
      const numero = await this.numeros.next('transaction', payload.year);
      return tx.transaction.create({
        data: {
          ...payload,
          numero,
          tarifUnitaire: payload.montant,
        },
      });
    });
  }

  async sumPaid(criteria: TransactionCriteria) {
    const result = await db().transaction.aggregate({
      where: { AND: [this.buildWhere(criteria), { statut: 'PAYE' }] },
      _sum: { montant: true },
      _count: { _all: true },
    });
    return { montant: Number(result._sum.montant || 0), nombre: result._count._all };
  }

  async paidByCategory(year: number, range?: DateRange) {
    const rows = await db().transaction.groupBy({
      by: ['categorie'],
      where: { year, statut: 'PAYE', ...(range ? { date: { gte: range.from, lt: range.to } } : {}) },
      _sum: { montant: true },
      _count: { _all: true },
    });
    return rows.map((row) => ({ categorie: row.categorie, montant: Number(row._sum.montant || 0), nombre: row._count._all }));
  }

  async usedCategories(year?: number) {
    const rows = await db().transaction.groupBy({ by: ['categorie'], where: year ? { year } : {}, _count: { _all: true } });
    return rows.map((row) => ({ categorie: row.categorie, nombre: row._count._all }));
  }

  async yearTotals(year: number) {
    const result = await db().transaction.aggregate({ where: { year }, _sum: { montant: true }, _count: { _all: true } });
    return { nombre: result._count._all, montant: Number(result._sum.montant || 0) };
  }

  async *iterateForExport(criteria: TransactionCriteria, batchSize = 2000) {
    let cursor: string | undefined;
    for (;;) {
      const batch = await db().transaction.findMany({
        where: this.buildWhere(criteria),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          numero: true,
          date: true,
          categorie: true,
          service: true,
          montant: true,
          statut: true,
          modePaiement: true,
          contribuable: { select: { nom: true, prenom: true, nin: true } },
          agent: { select: { nom: true, prenom: true } },
        },
      });
      if (batch.length === 0) return;
      yield batch.map((row) => ({
        numero: row.numero,
        date: row.date,
        categorie: row.categorie,
        service: row.service,
        montant: Number(row.montant),
        statut: row.statut,
        modePaiement: row.modePaiement,
        contribuable: `${row.contribuable?.prenom || ''} ${row.contribuable?.nom || ''}`.trim(),
        nin: row.contribuable?.nin || '',
        agent: `${row.agent?.prenom || ''} ${row.agent?.nom || ''}`.trim(),
      }));
      if (batch.length < batchSize) return;
      cursor = batch[batch.length - 1].id;
    }
  }

  async findRecentByYear(year: number, limit: number) {
    const transactions = await db().transaction.findMany({
      where: { year },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { agent: true },
    });
    return transactions.map((transaction) => this.mapTransaction(transaction));
  }

  async findByContribuableId(contribuableId: string) {
    const transactions = await db().transaction.findMany({
      where: { contribuableId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        numero: true,
        categorie: true,
        service: true,
        year: true,
        montant: true,
        statut: true,
        date: true,
      },
    });
    return transactions.map((transaction) => ({
      ...transaction,
      montant: Number(transaction.montant),
    }));
  }

  async findPortalPayables(contribuableId: string, transactionIds: string[]) {
    const transactions = await db().transaction.findMany({
      where: {
        contribuableId,
        id: { in: transactionIds },
      },
      select: {
        id: true,
        numero: true,
        montant: true,
        statut: true,
      },
    });
    return transactions.map((transaction) => ({
      ...transaction,
      montant: Number(transaction.montant),
    }));
  }

  async markPortalPaymentAsPaid(contribuableId: string, transactionIds: string[], modePaiement: string) {
    await db().transaction.updateMany({
      where: {
        contribuableId,
        id: { in: transactionIds },
        statut: { not: 'PAYE' },
      },
      data: {
        statut: 'PAYE',
        modePaiement,
        date: new Date(),
      },
    });

    const transactions = await db().transaction.findMany({
      where: {
        contribuableId,
        id: { in: transactionIds },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        numero: true,
        montant: true,
        statut: true,
        service: true,
        date: true,
      },
    });
    return transactions.map((transaction) => ({
      ...transaction,
      montant: Number(transaction.montant),
    }));
  }

  async findDetailsById(transactionId: string) {
    const transaction = await db().transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        numero: true,
        categorie: true,
        service: true,
        montant: true,
        statut: true,
        modePaiement: true,
        date: true,
        contribuable: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            nin: true,
            telephone: true,
          },
        },
      },
    });
    return transaction ? {
      ...transaction,
      montant: Number(transaction.montant),
    } : null;
  }

  async update(id: string, payload: Partial<CreateTransactionPayload>) {
    return db().transaction.update({
      where: { id },
      data: payload,
    });
  }

  async findSummaryById(id: string) {
    const row = await db().transaction.findUnique({ where: { id }, select: { numero: true, montant: true, service: true } });
    return row ? { ...row, montant: Number(row.montant) } : null;
  }

  async delete(id: string) {
    await db().transaction.delete({
      where: { id },
    });
  }

  private buildWhere(filters: TransactionCriteria): Prisma.TransactionWhereInput {
    const from = parseDay(filters.startDate);
    const until = parseDay(filters.endDate);
    const words = (filters.search || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
    return {
      // Chaque mot doit se retrouver dans le numéro, le service, la catégorie ou le contribuable.
      ...(words.length
        ? {
            AND: words.map((word) => ({
              OR: [
                { numero: { contains: word, mode: 'insensitive' as const } },
                { service: { contains: word, mode: 'insensitive' as const } },
                { categorie: { contains: word, mode: 'insensitive' as const } },
                { contribuable: { nom: { contains: word, mode: 'insensitive' as const } } },
                { contribuable: { prenom: { contains: word, mode: 'insensitive' as const } } },
                { contribuable: { nin: { contains: word } } },
              ],
            })),
          }
        : {}),
      ...(filters.categories?.length
        ? { categorie: { in: filters.categories } }
        : filters.categorie
          ? { categorie: filters.categorie }
          : {}),
      ...(filters.statut ? { statut: filters.statut } : {}),
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
      ...(from || until
        ? { date: { ...(from ? { gte: from } : {}), ...(until ? { lt: new Date(until.getTime() + DAY_MS) } : {}) } }
        : {}),
    };
  }

  private mapTransaction<T extends { montant: unknown; tarifUnitaire?: unknown }>(transaction: T) {
    return {
      ...transaction,
      montant: Number(transaction.montant),
      ...(transaction.tarifUnitaire === undefined ? {} : { tarifUnitaire: Number(transaction.tarifUnitaire) }),
    };
  }
}
