import { ModePaiement } from '../../../shared/ui/mode-paiement/mode-paiement';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Modal } from '../../../components/feature/modal';
import { Field } from '../../../components/feature/field';
import { ContribuableSelect, requireSelectedContribuable } from '../../../components/feature/contribuable-select';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../../utils/form-validation';
import { INPUT_CLASS, formatDate, formatTime, ReceiptData } from '../types';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TaxesApi } from '../../../services/taxes';

const BUTTON_PRIMARY =
  'px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60';

const BUTTON_SECONDARY = 'px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap';

@Component({
  selector: 'app-nouveau-ticket-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModePaiement, Modal, Field, ContribuableSelect],
  templateUrl: './nouveau-ticket-modal.html',
})
export class NouveauTicketModal {
  protected readonly modePaiement = signal('ESPECE');
  protected readonly BUTTON_PRIMARY = BUTTON_PRIMARY;
  protected readonly BUTTON_SECONDARY = BUTTON_SECONDARY;
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly taxesApi = inject(TaxesApi);
  readonly closed = output<void>();

  readonly saved = output<void>();

  readonly print = output<ReceiptData>();

  protected readonly submitting = signal(false);

  protected readonly receipt = signal<ReceiptData | null>(null);

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    const form = (e.currentTarget as HTMLFormElement);
    if (!validateFormElement(form))
    return;
    const contribuableId = requireSelectedContribuable(form, 'contributorId');
    if (!contribuableId)
    return;
    const data = new FormData(form);
    const type = String(data.get('type') || '').trim();
    const amount = Number(data.get('amount') || 0);
    const reference = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    this.submitting.set(true);
    try {
    const created = await this.taxesApi.createTransaction({
    contribuableId,
    categorie: type,
    type,
    service: type,
    quantite: 1,
    montant: amount,
    modePaiement: this.modePaiement(),
    reference,
    });
    const now = new Date();
    const label = String(data.get('contribuableRecherche') || '').replace(/\s*\([^)]*\)\s*$/, '');
    this.receipt.set({
    ticketNumber: created?.numero || reference,
    type,
    contributor: label || '-',
    amount,
    date: formatDate(now),
    time: formatTime(now),
    agent: this.auth.userName() || 'Agent Municipal',
    });
    await this.saved.emit();
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, "Impossible d'enregistrer le ticket."), 'error');
    }
    finally {
    this.submitting.set(false);
    }
    }
}
