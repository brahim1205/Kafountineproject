import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { clearFieldValidationError, validateFormElement } from '../../../../utils/form-validation';
import { INPUT_CLASS } from './statuts';
import { Modal } from '../../../../components/feature/modal';
import { Field } from '../../../../components/feature/field';
import { FooterButtons } from '../../../../components/feature/footer-buttons';
import { QuaiPecheApi } from '../../../../services/quai-peche';

@Component({
  selector: 'app-camion-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, FooterButtons, Field],
  templateUrl: './camion-modal.html',
})
export class CamionModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly quaiPecheApi = inject(QuaiPecheApi);
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
    await this.quaiPecheApi.createCamion({
    immatriculation: field('immatriculation') as string,
    marque: field('marque') as string,
    modele: field('modele'),
    capacite: field('capacite') ? Number(field('capacite')) : undefined,
    chauffeur: field('chauffeur'),
    telephone: field('telephone'),
    });
    await this.saved.emit();
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : 'Impossible de créer le camion.');
    }
    finally {
    this.submitting.set(false);
    }
    }
}
