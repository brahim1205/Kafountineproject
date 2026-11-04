import type { TransactionRepository } from '../domain/TransactionRepository';

type YearTransaction = Awaited<ReturnType<TransactionRepository['findByYear']>>[number];

/** Recettes encaissées (transactions PAYE) d'une période, avec leur répartition par catégorie. */
function periodStats(transactions: YearTransaction[]) {
  const paid = transactions.filter((transaction) => transaction.statut === 'PAYE');
  const total = paid.reduce((sum, transaction) => sum + transaction.montant, 0);
  const byCategory = new Map<string, number>();
  for (const transaction of paid) {
    byCategory.set(transaction.categorie, (byCategory.get(transaction.categorie) || 0) + transaction.montant);
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
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(year: number, now = new Date()) {
    const transactions = await this.transactionRepository.findByYear(year);
    const sameDay = (date: Date) => date.toDateString() === now.toDateString();
    const sameMonth = (date: Date) => date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

    return {
      aujourdhui: periodStats(transactions.filter((transaction) => sameDay(transaction.date))),
      mois: periodStats(transactions.filter((transaction) => sameMonth(transaction.date))),
      annee: periodStats(transactions),
      // Champs historiques, lus par le tableau de bord super admin.
      totalTransactions: transactions.length,
      recettesPayees: transactions
        .filter((transaction) => transaction.statut === 'PAYE')
        .reduce((sum, transaction) => sum + transaction.montant, 0),
      recettesTotal: transactions.reduce((sum, transaction) => sum + transaction.montant, 0),
    };
  }
}
