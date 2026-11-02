import type { CreateTransactionPayload, TransactionRepository } from '../domain/TransactionRepository';

export class UpdateTransactionUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(id: string, input: {
    contribuableId?: string;
    categorie?: string;
    type?: string;
    service?: string;
    quantite?: number;
    montant?: number;
    modePaiement?: string;
    statut?: string;
  }) {
    const updateData: Partial<CreateTransactionPayload> & { tarifUnitaire?: number } = {};
    if (input.contribuableId !== undefined) updateData.contribuableId = input.contribuableId;
    if (input.categorie !== undefined) updateData.categorie = input.categorie;
    if (input.type !== undefined || input.categorie !== undefined) updateData.service = input.service || input.categorie || input.type;
    if (input.quantite !== undefined) updateData.quantite = Number(input.quantite);
    if (input.montant !== undefined) {
      updateData.montant = Number(input.montant);
      updateData.tarifUnitaire = Number(input.montant);
    }
    if (input.modePaiement !== undefined) updateData.modePaiement = input.modePaiement;
    if (input.statut !== undefined) updateData.statut = input.statut;

    return this.transactionRepository.update(id, updateData);
  }
}
