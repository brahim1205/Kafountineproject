import type { TransactionRepository } from '../domain/TransactionRepository';

export class DeleteTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(id: string) {
    return this.transactionRepository.delete(id);
  }
}
