import type { TransactionRepository } from '../../transactions/domain/TransactionRepository';

export class GetPortalTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(contribuableId: string) {
    const items = await this.transactionRepository.findByContribuableId(contribuableId);

    return items.map((item) => ({
      id: item.id,
      numero: item.numero,
      montant: item.montant,
      statut: item.statut,
      createdAt: item.date.toISOString(),
      service: item.service,
    }));
  }
}
