import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Pecheur } from '../../../../services/quai-peche';
import { clearFieldValidationError } from '../../../../utils/form-validation';

export type EmbarcationFormData = { nom: string; immatriculation: string; type: string; taille: string; moteur: string; pecheurId: string };

@Component({
  selector: 'app-embarcation-form-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './embarcation-form-modal.html',
})
export class EmbarcationFormModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly title = input.required<string>();

  readonly formData = input.required<EmbarcationFormData>();

  readonly setFormData = input.required<(value: EmbarcationFormData) => void>();

  readonly submitted = output<Event>();

  readonly closed = output<void>();

  readonly pecheurs = input.required<Pecheur[]>();

  protected onNomChange(e: Event) {
    return this.setFormData()({ ...this.formData(), nom: (e.target as HTMLInputElement).value });
  }

  protected onImmatriculationChange(e: Event) {
    return this.setFormData()({ ...this.formData(), immatriculation: (e.target as HTMLInputElement).value });
  }

  protected onTypeChange(e: Event) {
    return this.setFormData()({ ...this.formData(), type: (e.target as HTMLInputElement).value });
  }

  protected onTailleChange(e: Event) {
    return this.setFormData()({ ...this.formData(), taille: (e.target as HTMLInputElement).value });
  }

  protected onMoteurChange(e: Event) {
    return this.setFormData()({ ...this.formData(), moteur: (e.target as HTMLInputElement).value });
  }

  protected onPecheurIdChange(e: Event) {
    return this.setFormData()({ ...this.formData(), pecheurId: (e.target as HTMLInputElement).value });
  }
}
