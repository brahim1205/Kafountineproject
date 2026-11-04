import { assertPortalPaymentsEnabled } from './portalPayments';
import { ForbiddenError, NotFoundError } from '../../../shared/errors/AppError';
import type { PortalPaymentStore } from '../domain/PortalPaymentStore';
import type { TransactionRepository } from '../../transactions/domain/TransactionRepository';

export class ConfirmPortalPaymentUseCase {
  constructor(
    private readonly paymentStore: PortalPaymentStore,
    private readonly transactionRepository: TransactionRepository
  ) {}

  async execute(input: { transactionId?: string; reference?: string }, contribuableId: string) {
    assertPortalPaymentsEnabled();
    const paymentId = String(input.transactionId || '').trim();
    const pendingPayment = await this.paymentStore.find(paymentId);

    if (!pendingPayment) {
      throw new NotFoundError('Paiement portail introuvable ou expiré');
    }

    if (pendingPayment.contribuableId !== contribuableId) {
      throw new ForbiddenError('Ce paiement ne vous appartient pas');
    }

    const transactions = await this.transactionRepository.markPortalPaymentAsPaid(
      contribuableId,
      pendingPayment.taxIds,
      pendingPayment.method.toUpperCase() === 'WAVE' || pendingPayment.method.toUpperCase() === 'ORANGE' || pendingPayment.method.toUpperCase() === 'FREE'
        ? 'MOBILE_MONEY'
        : pendingPayment.method.toUpperCase()
    );

    await this.paymentStore.delete(paymentId);

    return {
      success: true,
      paymentId,
      transactionId: transactions[0]?.id || null,
      transactionIds: transactions.map((transaction) => transaction.id),
      reference: input?.reference || null,
      message: 'Paiement confirmé',
      transaction: { statut: 'PAYE' },
      transactions,
    };
  }
}
