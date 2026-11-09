import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Pecheur } from '../../../../services/quai-peche';
import { clearFieldValidationError } from '../../../../utils/form-validation';

export type CommissionFormData = { pecheurId: string; poids: string; typePoisson: string; temperatura: string; observations: string };

@Component({
  selector: 'app-commission-form-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './commission-form-modal.html',
})
export class CommissionFormModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly formData = input.required<CommissionFormData>();

  readonly setFormData = input.required<(value: CommissionFormData) => void>();

  readonly submitted = output<Event>();

  readonly closed = output<void>();

  readonly pecheurs = input.required<Pecheur[]>();

  protected onPecheurIdChange(e: Event) {
    return this.setFormData()({ ...this.formData(), pecheurId: (e.target as HTMLInputElement).value });
  }

  protected onPoidsChange(e: Event) {
    return this.setFormData()({ ...this.formData(), poids: (e.target as HTMLInputElement).value });
  }

  protected onTypePoissonChange(e: Event) {
    return this.setFormData()({ ...this.formData(), typePoisson: (e.target as HTMLInputElement).value });
  }

  protected onTemperaturaChange(e: Event) {
    return this.setFormData()({ ...this.formData(), temperatura: (e.target as HTMLInputElement).value });
  }

  protected toISOStringSummary() {
    return new Date().toISOString().split('T')[0];
  }

  protected onObservationsChange(e: Event) {
    return this.setFormData()({ ...this.formData(), observations: (e.target as HTMLInputElement).value });
  }
}
