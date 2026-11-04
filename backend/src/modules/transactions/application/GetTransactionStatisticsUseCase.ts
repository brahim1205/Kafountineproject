import type { TaxCatalog } from '../domain/TaxCatalog';
import type { TransactionRepository } from '../domain/TransactionRepository';
import { buildCategoryLabeler, type CategoryLabeler } from './categoryLabels';

type YearTransaction = Awaited<ReturnType<TransactionRepository['findByYear']>>[number];

/** Recettes encaissées (transactions PAYE) d'une période, avec leur répartition par catégorie. */
function periodStats(transactions: YearTransaction[], label: CategoryLabeler) {
  const paid = transactions.filter((transaction) => transaction.statut === 'PAYE');
  const total = paid.reduce((sum, transaction) => sum + transaction.montant, 0);
  const byCategory = new Map<string, number>();
  for (const transaction of paid) {
    const nom = label(transaction.categorie);
    byCategory.set(nom, (byCategory.get(nom) || 0) + transaction.montant);
  }
  return {
    total,
    transactions: paid.length,
    categories: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nom, montant]) => ({ nom, montant, pourcentage: total > 0 ? Math.round((montant / total) * 100) : 0 })),
  };
}

export class GetTransactionStatisticsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly taxCatalog?: TaxCatalog
  ) {}

  async execute(year: number, now = new Date()) {
    const [transactions, label] = await Promise.all([
      this.transactionRepository.findByYear(year),
      buildCategoryLabeler(this.taxCatalog),
    ]);
    const sameDay = (date: Date) => date.toDateString() === now.toDateString();
    const sameMonth = (date: Date) => date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

    return {
      aujourdhui: periodStats(transactions.filter((transaction) => sameDay(transaction.date)), label),
      mois: periodStats(transactions.filter((transaction) => sameMonth(transaction.date)), label),
      annee: periodStats(transactions, label),
      // Champs historiques, lus par le tableau de bord super admin.
      totalTransactions: transactions.length,
      recettesPayees: transactions
        .filter((transaction) => transaction.statut === 'PAYE')
        .reduce((sum, transaction) => sum + transaction.montant, 0),
      recettesTotal: transactions.reduce((sum, transaction) => sum + transaction.montant, 0),
    };
  }
}
