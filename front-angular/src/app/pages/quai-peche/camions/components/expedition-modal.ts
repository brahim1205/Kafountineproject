import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CamionFrigorifique } from '../../../../services/quai-peche';
import { clearFieldValidationError, validateFormElement } from '../../../../utils/form-validation';
import { INPUT_CLASS } from './statuts';
import { Modal } from '../../../../components/feature/modal';
import { Field } from '../../../../components/feature/field';
import { FooterButtons } from '../../../../components/feature/footer-buttons';
import { QuaiPecheApi } from '../../../../services/quai-peche';

@Component({
  selector: 'app-expedition-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, FooterButtons, Field],
  templateUrl: './expedition-modal.html',
})
export class ExpeditionModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly quaiPecheApi = inject(QuaiPecheApi);
  readonly camionsActifs = input.required<CamionFrigorifique[]>();

  readonly closed = output<void>();

  readonly saved = output<void>();

  protected readonly submitting = signal(false);

  protected readonly error = signal('');

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateFormElement((e.currentTarget as HTMLFormElement)))
    return;
    const data = new FormData((e.currentTarget as HTMLFormElement));
    const field = (name: string) => ((data.get(name) as string) || '').trim() || undefined;
    this.submitting.set(true);
    this.error.set('');
    try {
    await this.quaiPecheApi.createExpedition({
    camionId: field('camionId') as string,
    poids: Number(field('poids')),
    destination: field('destination'),
    montant: field('montant') ? Number(field('montant')) : undefined,
    observations: field('observations'),
    });
    await this.saved.emit();
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : "Impossible de créer l'expédition.");
    }
    finally {
    this.submitting.set(false);
    }
    }
}
