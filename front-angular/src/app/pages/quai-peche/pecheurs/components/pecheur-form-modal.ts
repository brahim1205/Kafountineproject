import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { clearFieldValidationError } from '../../../../utils/form-validation';

export type PecheurFormData = { nom: string; prenom: string; telephone: string; nin: string; adresse: string };

@Component({
  selector: 'app-pecheur-form-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './pecheur-form-modal.html',
})
export class PecheurFormModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly title = input.required<string>();

  readonly formData = input.required<PecheurFormData>();

  readonly setFormData = input.required<(value: PecheurFormData) => void>();

  readonly submitted = output<Event>();

  readonly closed = output<void>();

  protected onNomChange(e: Event) {
    return this.setFormData()({ ...this.formData(), nom: (e.target as HTMLInputElement).value });
  }

  protected onPrenomChange(e: Event) {
    return this.setFormData()({ ...this.formData(), prenom: (e.target as HTMLInputElement).value });
  }

  protected onTelephoneChange(e: Event) {
    return this.setFormData()({ ...this.formData(), telephone: (e.target as HTMLInputElement).value });
  }

  protected onNinChange(e: Event) {
    return this.setFormData()({ ...this.formData(), nin: (e.target as HTMLInputElement).value });
  }

  protected onAdresseChange(e: Event) {
    return this.setFormData()({ ...this.formData(), adresse: (e.target as HTMLInputElement).value });
  }
}
