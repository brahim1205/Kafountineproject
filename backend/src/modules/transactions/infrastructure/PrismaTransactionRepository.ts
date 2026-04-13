import type { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type {
  CreateTransactionPayload,
  TransactionFilters,
  TransactionRepository,
} from '../domain/TransactionRepository';

export class PrismaTransactionRepository implements TransactionRepository {
  async search(filters: TransactionFilters) {
    return prisma.transaction.findMany({
      where: this.buildWhere(filters),
      include: { contribuable: true, agent: true },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(filters: TransactionFilters) {
    return prisma.transaction.count({
      where: this.buildWhere(filters),
    });
  }

  async countByYear(year: number) {
    return prisma.transaction.count({ where: { year } });
  }

  async create(payload: CreateTransactionPayload) {
    return prisma.transaction.create({
      data: {
        ...payload,
        tarifUnitaire: payload.montant,
      },
    });
  }

  async createWithAtomicNumero(payload: Omit<CreateTransactionPayload, 'numero'>) {
    return prisma.$transaction(async (tx) => {
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
    return prisma.transaction.findMany({
      where: { year },
      select: { montant: true, statut: true },
    });
  }

  async findRecentByYear(year: number, limit: number) {
    return prisma.transaction.findMany({
      where: { year },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { agent: true },
    });
  }

  async findByContribuableId(contribuableId: string) {
    return prisma.transaction.findMany({
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
  }

  async findPortalPayables(contribuableId: string, transactionIds: string[]) {
    return prisma.transaction.findMany({
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
  }

  async markPortalPaymentAsPaid(contribuableId: string, transactionIds: string[], modePaiement: string) {
    await prisma.transaction.updateMany({
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

    return prisma.transaction.findMany({
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
  }

  async findDetailsById(transactionId: string) {
    return prisma.transaction.findUnique({
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
}
