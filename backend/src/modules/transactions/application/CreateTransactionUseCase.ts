import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { TransactionRepository } from '../domain/TransactionRepository';

export class CreateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async execute(actor: Actor, input: {
    contribuableId: string;
    agentId: string;
    categorie?: string;
    type?: string;
    service?: string;
    quantite?: number;
    montant?: number;
    modePaiement?: string;
    statut?: string;
    date?: string;
  }) {
    const year = new Date().getFullYear();

    const created = await this.transactionRepository.createWithAtomicNumero({
      contribuableId: input.contribuableId,
      agentId: input.agentId,
      categorie: String(input.categorie || input.type || 'TAXE'),
      service: String(input.service || input.categorie || input.type || 'Taxe'),
      quantite: Number(input.quantite || 1),
      montant: Number(input.montant || 0),
      modePaiement: String(input.modePaiement || 'ESPECE'),
      statut: String(input.statut || 'PAYE'),
      date: input.date ? new Date(String(input.date)) : new Date(),
      year,
    });

    await this.auditTrail.record(actor, {
      action: 'Encaissement',
      module: 'Recettes',
      details: `Transaction ${created.numero} enregistrée : ${created.service} (${Number(created.montant)} FCFA)`,
    });
    return created;
  }
}
