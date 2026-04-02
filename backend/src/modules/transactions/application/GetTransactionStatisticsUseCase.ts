import type { TransactionRepository } from '../domain/TransactionRepository';

export class GetTransactionStatisticsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(year: number) {
    const transactions = await this.transactionRepository.findByYear(year);

    return {
      totalTransactions: transactions.length,
      recettesPayees: transactions
        .filter((transaction) => transaction.statut === 'PAYE')
        .reduce((sum, transaction) => sum + transaction.montant, 0),
      recettesTotal: transactions.reduce((sum, transaction) => sum + transaction.montant, 0),
    };
  }
}
