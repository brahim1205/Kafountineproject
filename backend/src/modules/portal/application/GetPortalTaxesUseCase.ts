import type { TransactionRepository } from '../../transactions/domain/TransactionRepository';

export class GetPortalTaxesUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(contribuableId: string) {
    const items = await this.transactionRepository.findByContribuableId(contribuableId);

    return items.map((item) => ({
      id: item.id,
      type: item.categorie,
      annee: item.year,
      montant: item.montant,
      statut: item.statut === 'PAYE' ? 'PAID' : 'PENDING',
      dateEcheance: item.date.toISOString().split('T')[0],
    }));
  }
}
