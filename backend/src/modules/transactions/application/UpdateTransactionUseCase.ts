import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import { NotFoundError } from '../../../shared/errors/AppError';
import type { CreateTransactionPayload, TransactionRepository } from '../domain/TransactionRepository';

export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async execute(actor: Actor, id: string, input: {
    contribuableId?: string;
    categorie?: string;
    type?: string;
    service?: string;
    quantite?: number;
    montant?: number;
    modePaiement?: string;
    statut?: string;
  }) {
    const before = await this.transactionRepository.findSummaryById(id);
    if (!before) {
      throw new NotFoundError('Transaction introuvable.');
    }
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

    const updated = await this.transactionRepository.update(id, updateData);
    const montant = updateData.montant === undefined ? '' : ` ; montant ${before.montant} → ${updateData.montant} FCFA`;
    await this.auditTrail.record(actor, {
      action: 'Modification transaction',
      module: 'Recettes',
      details: `Transaction ${before.numero} modifiée${montant}`,
      status: 'warning',
    });
    return updated;
  }
}
