import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed } from '@angular/core';
import { Modal } from '../../../components/feature/modal';
import { Field } from '../../../components/feature/field';
import { ContribuableSelect, requireSelectedContribuable } from '../../../components/feature/contribuable-select';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../../utils/form-validation';
import { INPUT_CLASS, RecetteRow } from '../types';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { TaxesApi } from '../../../services/taxes';

@Component({
  selector: 'app-modifier-ticket-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Field, ContribuableSelect],
  templateUrl: './modifier-ticket-modal.html',
})
export class ModifierTicketModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly toast = inject(ToastService);
  protected readonly taxesApi = inject(TaxesApi);
  readonly row = input.required<RecetteRow>();

  readonly closed = output<void>();

  readonly saved = output<void>();

  protected readonly busy = signal(false);

  protected async run(action: () => Promise<unknown>, success: string, failure: string) {
    this.busy.set(true);
    try {
    await action();
    this.toast.show(success, 'success');
    await this.saved.emit();
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, failure), 'error');
    }
    finally {
    this.busy.set(false);
    }
    }

  protected handleSubmit(e: Event) {
    e.preventDefault();
    const form = (e.currentTarget as HTMLFormElement);
    if (!validateFormElement(form))
    return;
    const contribuableId = requireSelectedContribuable(form, 'contributorId');
    if (!contribuableId)
    return;
    const data = new FormData(form);
    this.run(() => this.taxesApi.updateTransaction(this.row().id, {
    type: String(data.get('type') || '').trim(),
    contribuableId,
    montant: Number(data.get('amount') || 0),
    }), 'Ticket mis à jour avec succès.', 'Erreur lors de la mise à jour.');
    }

  protected handleDelete() {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette transaction ?'))
    return;
    this.run(() => this.taxesApi.deleteTransaction(this.row().id), 'Transaction annulée.', 'Erreur lors de l’annulation.');
    }

  protected readonly initial = computed(() => this.row().contribuableId
    ? { id: this.row().contribuableId, label: this.row().contribuableNin ? `${this.row().contributor} (${this.row().contribuableNin})` : this.row().contributor }
    : undefined);
}
