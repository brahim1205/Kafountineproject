import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { clearFieldValidationError } from '../../../utils/form-validation';

type Depense = { service: string; description: string; montant: number };

@Component({
  selector: 'app-depense-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './depense-modal.html',
})
export class DepenseModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly depense = input.required<Depense>();

  readonly setDepense = input.required<(value: Depense) => void>();

  readonly submitted = output<Event>();

  readonly closed = output<void>();

  protected onServiceChange(e: Event) {
    return this.setDepense()({ ...this.depense(), service: (e.target as HTMLInputElement).value });
  }

  protected onDescriptionChange(e: Event) {
    return this.setDepense()({ ...this.depense(), description: (e.target as HTMLInputElement).value });
  }

  protected onMontantChange(e: Event) {
    return this.setDepense()({ ...this.depense(), montant: parseInt((e.target as HTMLInputElement).value) || 0 });
  }
}
