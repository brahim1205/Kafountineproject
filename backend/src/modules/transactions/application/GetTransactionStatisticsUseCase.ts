import type { TaxCatalog } from '../domain/TaxCatalog';
import type { PaidByCategory, TransactionRepository } from '../domain/TransactionRepository';
import { buildCategoryLabeler, type CategoryLabeler } from './categoryLabels';

/** Recettes encaissées (tickets PAYE) d'une période, avec leur répartition par catégorie. */
function periodStats(rows: PaidByCategory[], label: CategoryLabeler) {
  const byCategory = new Map<string, number>();
  let total = 0;
  let transactions = 0;
  for (const row of rows) {
    const nom = label(row.categorie);
    byCategory.set(nom, (byCategory.get(nom) || 0) + row.montant);
    total += row.montant;
    transactions += row.nombre;
  }
  return {
    total,
    transactions,
    categories: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nom, montant]) => ({ nom, montant, pourcentage: total > 0 ? Math.round((montant / total) * 100) : 0 })),
  };
}

/** Statistiques calculées en base (sommes groupées) : leur coût ne dépend pas du nombre de tickets de l'année. */
export class GetTransactionStatisticsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly taxCatalog?: TaxCatalog
  ) {}

  async execute(year: number, now = new Date()) {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [jour, mois, annee, totals, label] = await Promise.all([
      this.transactionRepository.paidByCategory(year, { from: startOfDay, to: startOfNextDay }),
      this.transactionRepository.paidByCategory(year, { from: startOfMonth, to: startOfNextMonth }),
      this.transactionRepository.paidByCategory(year),
      this.transactionRepository.yearTotals(year),
      buildCategoryLabeler(this.taxCatalog),
    ]);
    const anneeStats = periodStats(annee, label);

    return {
      aujourdhui: periodStats(jour, label),
      mois: periodStats(mois, label),
      annee: anneeStats,
      // Champs historiques, lus par le tableau de bord super admin.
      totalTransactions: totals.nombre,
      recettesPayees: anneeStats.total,
      recettesTotal: totals.montant,
    };
  }
}
