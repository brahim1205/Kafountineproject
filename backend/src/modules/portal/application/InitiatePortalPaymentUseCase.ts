import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/AppError';
import { env } from '../../../shared/config/env';
import type { PortalPaymentStore } from '../domain/PortalPaymentStore';
import type { TransactionRepository } from '../../transactions/domain/TransactionRepository';

export class InitiatePortalPaymentUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly paymentStore: PortalPaymentStore
  ) {}

  execute(input: {
    amount?: number;
    montant?: number;
    phone?: string;
    telephone?: string;
    method?: string;
    taxes?: string[];
    categorie?: string;
  }, contribuableId: string) {
    return this.doExecute(input, contribuableId);
  }

  private async doExecute(input: {
    amount?: number;
    montant?: number;
    phone?: string;
    telephone?: string;
    method?: string;
    taxes?: string[];
    categorie?: string;
  }, contribuableId: string) {
    const taxIds = Array.isArray(input.taxes) ? input.taxes.filter(Boolean) : [];
    if (taxIds.length === 0) {
      throw new ValidationError('Veuillez sélectionner au moins une taxe à payer');
    }

    const selectedTaxes = await this.transactionRepository.findPortalPayables(contribuableId, taxIds);
    if (selectedTaxes.length !== taxIds.length) {
      throw new NotFoundError('Certaines taxes sélectionnées sont introuvables');
    }

    if (selectedTaxes.every((item) => item.statut === 'PAYE')) {
      throw new ConflictError('Les taxes sélectionnées sont déjà payées');
    }

    const amount = selectedTaxes.reduce((sum, item) => sum + Number(item.montant || 0), 0);
    const phone = String(input.phone || input.telephone || '').trim();
    const method = String(input.method || 'wave').trim();
    const paymentId = `PAY-${Date.now()}-${randomUUID().slice(0, 8)}`;

    await this.paymentStore.save({
      paymentId,
      contribuableId,
      taxIds,
      amount,
      phone,
      method,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      paymentId,
      transactionId: paymentId,
      paymentUrl: `${env.portalUrl}/portal/payer?status=success&tx_id=${encodeURIComponent(paymentId)}`,
      amount,
      phone,
      method,
      taxes: taxIds,
      categorie: String(input.categorie || 'Taxe'),
      message: 'Paiement initialisé',
    };
  }
}
