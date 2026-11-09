import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { clearFieldValidationError } from '../../../utils/form-validation';

type Ligne = { code: string; libelle: string; prevu: number };

@Component({
  selector: 'app-ligne-budget-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './ligne-budget-modal.html',
})
export class LigneBudgetModal {
  protected readonly clearFieldValidationError = clearFieldValidationError;

  readonly ligne = input.required<Ligne>();

  readonly setLigne = input.required<(value: Ligne) => void>();

  readonly submitted = output<Event>();

  readonly closed = output<void>();

  protected onCodeChange(e: Event) {
    return this.setLigne()({ ...this.ligne(), code: (e.target as HTMLInputElement).value });
  }

  protected onLibelleChange(e: Event) {
    return this.setLigne()({ ...this.ligne(), libelle: (e.target as HTMLInputElement).value });
  }

  protected onPrevuChange(e: Event) {
    return this.setLigne()({ ...this.ligne(), prevu: parseInt((e.target as HTMLInputElement).value) || 0 });
  }
}
