import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Penalite } from '../../../services/settings';
import { clearFieldValidationError, validateFormElement } from '../../../utils/form-validation';
import { INPUT_CLASS } from './ui';
import { Label } from './label';
import { Modal } from './modal';
import { ModalActions } from './modal-actions';
import { SettingsApi } from '../../../services/settings';

@Component({
  selector: 'app-penalite-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Label, ModalActions],
  templateUrl: './penalite-modal.html',
})
export class PenaliteModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly settingsApi = inject(SettingsApi);
  readonly penalite = input<Penalite | undefined>(undefined);

  readonly closed = output<void>();

  readonly saved = output<string>();

  readonly failed = output<string>();

  protected readonly submitting = signal(false);

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateFormElement((e.currentTarget as HTMLFormElement))) {
    return;
    }
    const formData = new FormData((e.currentTarget as HTMLFormElement));
    const values = {
    type: formData.get('type') as string,
    montant: Number(formData.get('montant')),
    delai: formData.get('delai') as string,
    description: (formData.get('description') as string) || undefined,
    };
    this.submitting.set(true);
    try {
    if (this.penalite()) {
    await this.settingsApi.updatePenalite(this.penalite()!.id, values);
    this.saved.emit('Pénalité modifiée avec succès !');
    }
    else {
    await this.settingsApi.createPenalite(values);
    this.saved.emit('Pénalité créée avec succès !');
    }
    }
    catch (error) {
    this.failed.emit(error instanceof Error ? error.message : 'Impossible d’enregistrer la pénalité.');
    }
    finally {
    this.submitting.set(false);
    }
    }
}
