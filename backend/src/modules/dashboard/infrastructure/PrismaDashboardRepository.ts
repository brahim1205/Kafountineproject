import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { DashboardRepository } from '../domain/DashboardRepository';

export class PrismaDashboardRepository implements DashboardRepository {
  countContribuables() {
    return prisma.contribuable.count();
  }

  countTransactionsByYear(year: number) {
    return prisma.transaction.count({ where: { year } });
  }

  async findRecentTransactionsByYear(year: number, limit: number) {
    const items = await prisma.transaction.findMany({
      where: { year },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { agent: true, contribuable: true },
    });

    return items.map((item) => ({
      id: item.id,
      numero: item.numero,
      montant: item.montant,
      categorie: item.categorie,
      statut: item.statut,
      createdAt: item.createdAt.toISOString(),
      contribuable: item.contribuable
        ? {
            id: item.contribuable.id,
            nom: item.contribuable.nom,
            prenom: item.contribuable.prenom,
            nin: item.contribuable.nin,
            telephone: item.contribuable.telephone,
          }
        : null,
      agent: item.agent ? { nom: item.agent.nom, prenom: item.agent.prenom } : null,
    }));
  }

  async getPaidRevenueByYear(year: number) {
    const result = await prisma.transaction.aggregate({
      where: { year, statut: 'PAYE' },
      _sum: { montant: true },
    });

    return result._sum.montant || 0;
  }

  async getRevenueByCategoryByYear(year: number) {
    const results = await prisma.transaction.groupBy({
      by: ['categorie'],
      where: { year, statut: 'PAYE' },
      _sum: { montant: true },
    });

    return results.map((r) => ({
      categorie: r.categorie,
      montant: r._sum.montant || 0,
    }));
  }

  async countTodayTransactionsByYear(year: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prisma.transaction.count({
      where: { year, createdAt: { gte: today } },
    });
  }

  async getTodayRevenueByYear(year: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await prisma.transaction.aggregate({
      where: { year, statut: 'PAYE', createdAt: { gte: today } },
      _sum: { montant: true },
    });
    return result._sum.montant || 0;
  }

  async getMonthlyRevenueByYear(year: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const result = await prisma.transaction.aggregate({
      where: { year, statut: 'PAYE', createdAt: { gte: startOfMonth } },
      _sum: { montant: true },
    });
    return result._sum.montant || 0;
  }

  async getWeeklyEvolutionByYear(year: number) {
    const now = new Date();
    const days: Array<{ jour: string; montant: number; transactions: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const transactions = await prisma.transaction.findMany({
        where: {
          year,
          statut: 'PAYE',
          createdAt: { gte: date, lt: nextDate },
        },
        select: { montant: true },
      });

      days.push({
        jour: date.toISOString().split('T')[0],
        montant: transactions.reduce((sum, t) => sum + t.montant, 0),
        transactions: transactions.length,
      });
    }

    return days;
  }
}
