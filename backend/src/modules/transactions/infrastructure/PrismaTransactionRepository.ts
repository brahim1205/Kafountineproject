import type { Prisma } from '@prisma/client';
import { db, inTransaction } from '../../../shared/infrastructure/prisma/transactionContext';
import type {
  CreateTransactionPayload,
  TransactionFilters,
  TransactionRepository,
} from '../domain/TransactionRepository';

export class PrismaTransactionRepository implements TransactionRepository {
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
      // Serialize numero generation per year to avoid unique constraint collisions.
      const lockKey = Number(`${payload.year}`.slice(-4));
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      const last = await tx.transaction.findFirst({
        where: { year: payload.year },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      });

      let nextNumber = 1;
      if (last?.numero) {
        const parts = last.numero.split('-');
        const tail = parts[parts.length - 1];
        const parsed = Number(tail);
        if (!Number.isNaN(parsed)) {
          nextNumber = parsed + 1;
        }
      }

      const numero = `TX-${payload.year}-${String(nextNumber).padStart(3, '0')}`;

      return tx.transaction.create({
        data: {
          ...payload,
          numero,
          tarifUnitaire: payload.montant,
        },
      });
    });
  }

  async findByYear(year: number) {
    const transactions = await db().transaction.findMany({
      where: { year },
      select: { montant: true, statut: true, categorie: true, date: true },
    });
    return transactions.map((transaction) => ({
      ...transaction,
      montant: Number(transaction.montant),
    }));
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

  private buildWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
    return {
      ...(filters.search
        ? {
            OR: [
              { numero: { contains: filters.search, mode: 'insensitive' } },
              { service: { contains: filters.search, mode: 'insensitive' } },
              { categorie: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filters.categorie ? { categorie: filters.categorie } : {}),
      ...(filters.statut ? { statut: filters.statut } : {}),
      ...(filters.year ? { year: filters.year } : {}),
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
