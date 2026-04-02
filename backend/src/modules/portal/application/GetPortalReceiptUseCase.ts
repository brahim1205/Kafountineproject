import { NotFoundError } from '../../../shared/errors/AppError';
import type { TransactionRepository } from '../../transactions/domain/TransactionRepository';

export class GetPortalReceiptUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(transactionId: string, contribuableId: string) {
    const transaction = await this.transactionRepository.findDetailsById(transactionId);

    if (!transaction) {
      throw new NotFoundError('Transaction introuvable');
    }

    if (transaction.contribuable.id !== contribuableId) {
      throw new NotFoundError('Transaction introuvable');
    }

    return {
      id: transaction.id,
      numero: transaction.numero,
      date: transaction.date.toISOString(),
      montant: transaction.montant,
      statut: transaction.statut,
      service: transaction.service,
      categorie: transaction.categorie,
      modePaiement: transaction.modePaiement,
      contribuable: {
        id: transaction.contribuable.id,
        nom: transaction.contribuable.nom,
        prenom: transaction.contribuable.prenom,
        nin: transaction.contribuable.nin,
        telephone: transaction.contribuable.telephone,
      },
    };
  }
}
