import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { DashboardRepository } from '../domain/DashboardRepository';

/**
 * Toutes les recettes encaissées de l'année ($1), quel que soit le module qui les enregistre :
 * taxes et tickets (Transaction payée), places du marché et motos (paiement payé),
 * actes d'état civil délivrés et dossiers d'urbanisme validés. Aucun de ces modules ne crée
 * de Transaction, il n'y a donc pas de double comptage.
 */
const LEDGER = `WITH recettes AS (
  SELECT 'Taxes et tickets'::text AS source, "categorie"::text AS categorie, "montant", "createdAt" AS d
    FROM "Transaction" WHERE "year" = $1 AND "statut" = 'PAYE'
  UNION ALL
  SELECT 'Marché', 'Marché', "montant", COALESCE("datePaiement", "createdAt")
    FROM "MarketPayment" WHERE "year" = $1 AND "statut" = 'PAYE'
  UNION ALL
  SELECT 'Motos', 'Motos', "montant", COALESCE("datePaiement", "createdAt")
    FROM "MotoPayment" WHERE "year" = $1 AND "statut" = 'PAYE'
  UNION ALL
  SELECT 'État civil', 'État civil', "montant", "createdAt"
    FROM "EtatCivilRequest" WHERE "year" = $1 AND "statut" IN ('DELIVREE', 'VALIDE')
  UNION ALL
  SELECT 'Urbanisme', 'Urbanisme', "montant", "createdAt"
    FROM "UrbanismeCase" WHERE "year" = $1 AND "statut" = 'VALIDE'
)`;

// Requêtes figées au chargement du module ; l'année et les dates passent en paramètres.
const TOTAL_SQL = LEDGER + ` SELECT COALESCE(SUM(montant), 0)::float8 AS montant FROM recettes`;
const BY_SOURCE_SQL = LEDGER + ` SELECT source, SUM(montant)::float8 AS montant, COUNT(*)::int AS nombre FROM recettes GROUP BY source ORDER BY 2 DESC`;
const BY_CATEGORY_SQL = LEDGER + ` SELECT categorie, SUM(montant)::float8 AS montant FROM recettes GROUP BY categorie`;
const BY_MONTH_SQL = LEDGER + ` SELECT EXTRACT(MONTH FROM d)::int AS mois, SUM(montant)::float8 AS montant, COUNT(*)::int AS nombre
       FROM recettes GROUP BY 1`;
const BETWEEN_SQL = LEDGER + ` SELECT COALESCE(SUM(montant), 0)::float8 AS montant, COUNT(*)::int AS nombre
       FROM recettes WHERE d >= $2 AND ($3::timestamp IS NULL OR d < $3::timestamp)`;

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
      montant: Number(item.montant),
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
    const [row] = await prisma.$queryRawUnsafe<Array<{ montant: number }>>(
      TOTAL_SQL,
      year
    );
    return Number(row?.montant || 0);
  }

  async getRevenueBySourceByYear(year: number) {
    const rows = await prisma.$queryRawUnsafe<Array<{ source: string; montant: number; nombre: number }>>(
      BY_SOURCE_SQL,
      year
    );
    return rows.map((row) => ({ source: row.source, montant: Number(row.montant || 0), nombre: Number(row.nombre || 0) }));
  }

  async getRevenueByCategoryByYear(year: number) {
    const rows = await prisma.$queryRawUnsafe<Array<{ categorie: string; montant: number }>>(
      BY_CATEGORY_SQL,
      year
    );
    return rows.map((row) => ({ categorie: row.categorie, montant: Number(row.montant || 0) }));
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
    return this.revenueBetween(year, today, null);
  }

  async getMonthlyRevenueByYear(year: number) {
    const now = new Date();
    return this.revenueBetween(year, new Date(now.getFullYear(), now.getMonth(), 1), null);
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
      const { montant, nombre } = await this.revenueRowsBetween(year, date, nextDate);
      days.push({ jour: date.toISOString().split('T')[0], montant, transactions: nombre });
    }

    return days;
  }

  async getMonthlyEvolutionByYear(year: number) {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    const rows = await prisma.$queryRawUnsafe<Array<{ mois: number; montant: number; nombre: number }>>(
      BY_MONTH_SQL,
      year
    );
    return monthNames.map((mois, index) => {
      const row = rows.find((item) => Number(item.mois) === index + 1);
      return { mois, montant: Number(row?.montant || 0), transactions: Number(row?.nombre || 0) };
    });
  }

  private async revenueBetween(year: number, from: Date, to: Date | null) {
    return (await this.revenueRowsBetween(year, from, to)).montant;
  }

  private async revenueRowsBetween(year: number, from: Date, to: Date | null) {
    const [row] = await prisma.$queryRawUnsafe<Array<{ montant: number; nombre: number }>>(
      BETWEEN_SQL,
      year,
      from,
      to
    );
    return { montant: Number(row?.montant || 0), nombre: Number(row?.nombre || 0) };
  }

  async getTopContribuables(year: number, limit: number) {
    const topTransactions = await prisma.transaction.groupBy({
      by: ['contribuableId'],
      where: { year, statut: 'PAYE' },
      _sum: { montant: true },
      orderBy: {
        _sum: { montant: 'desc' }
      },
      take: limit + 5 // Take slightly more in case some have no contribuable
    });

    const results = [];
    for (const tx of topTransactions) {
      if (!tx.contribuableId) continue;
      const contribuable = await prisma.contribuable.findUnique({ where: { id: tx.contribuableId } });
      if (contribuable) {
        results.push({
          id: contribuable.id,
          prenom: contribuable.prenom || '',
          nom: contribuable.nom || '',
          montantTotal: Number(tx._sum?.montant || 0)
        });
        if (results.length >= limit) break;
      }
    }
    return results;
  }
}
