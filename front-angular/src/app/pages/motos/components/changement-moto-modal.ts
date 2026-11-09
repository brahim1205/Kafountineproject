import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { clearFieldValidationError, validateFormElement } from '../../../utils/form-validation';
import { UiMoto } from '../types';
import { Field, INPUT_CLASS } from './field';
import { FormError } from './form-error';
import { ContribuablesApi } from '../../../services/contribuables';
import { MotosApi } from '../../../services/motos';

const TYPES_CHANGEMENT = [
  { value: 'proprietaire', titre: 'Propriétaire', description: 'Transfert de propriété' },
  { value: 'conducteur', titre: 'Conducteur', description: 'Changement de conducteur' },
];

@Component({
  selector: 'app-changement-moto-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field, FormError],
  templateUrl: './changement-moto-modal.html',
})
export class ChangementMotoModal {
  protected readonly TYPES_CHANGEMENT = TYPES_CHANGEMENT;
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly contribuablesApi = inject(ContribuablesApi);
  protected readonly motosApi = inject(MotosApi);
  readonly moto = input.required<UiMoto>();

  readonly closed = output<void>();

  readonly saved = output<void>();

  protected readonly error = signal('');

  protected readonly isSubmitting = signal(false);

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    this.error.set('');
    const form = (e.currentTarget as HTMLFormElement);
    if (!validateFormElement(form)) {
    return;
    }
    this.isSubmitting.set(true);
    try {
    const formData = new FormData(form);
    const field = (name: string) => (formData.get(name) as string) || '';
    const nouvellePersonne = await this.contribuablesApi.ensureContribuableByIdentity({
    cni: field('nouveauCNI'),
    fullName: field('nouveauNom'),
    telephone: field('nouveauTelephone'),
    adresse: field('nouvelleAdresse'),
    });
    if ((field('typeChangement') || 'proprietaire') === 'proprietaire') {
    await this.motosApi.updateMoto(this.moto().id, { proprietaireId: nouvellePersonne.id });
    }
    else {
    await this.motosApi.updateMoto(this.moto().id, { conducteurId: nouvellePersonne.id, permis: field('nouveauPermis') });
    }
    await this.saved.emit();
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : "Impossible d'enregistrer le changement");
    }
    finally {
    this.isSubmitting.set(false);
    }
    }

  protected motoSummary() {
    return ([
    ['Propriétaire', this.moto().proprietaire],
    ['Conducteur', this.moto().conducteur],
    ] as const);
  }
}
