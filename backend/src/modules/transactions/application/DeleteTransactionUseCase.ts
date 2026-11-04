import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import { NotFoundError } from '../../../shared/errors/AppError';
import type { TransactionRepository } from '../domain/TransactionRepository';

export class DeleteTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async execute(actor: Actor, id: string) {
    const existing = await this.transactionRepository.findSummaryById(id);
    if (!existing) {
      throw new NotFoundError('Transaction introuvable.');
    }
    await this.transactionRepository.delete(id);
    await this.auditTrail.record(actor, {
      action: 'Suppression transaction',
      module: 'Recettes',
      details: `Transaction ${existing.numero} supprimée : ${existing.service} (${existing.montant} FCFA)`,
      status: 'warning',
    });
  }
}
