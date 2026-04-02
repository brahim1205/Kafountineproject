import type { TransactionRepository } from '../domain/TransactionRepository';

export class ListTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(input: {
    page: number;
    limit: number;
    search?: string;
    categorie?: string;
    statut?: string;
    year?: number;
  }) {
    const [data, total] = await Promise.all([
      this.transactionRepository.search(input),
      this.transactionRepository.count(input),
    ]);

    return {
      data,
      meta: {
        page: input.page,
        limit: input.limit,
        total,
      },
    };
  }
}
