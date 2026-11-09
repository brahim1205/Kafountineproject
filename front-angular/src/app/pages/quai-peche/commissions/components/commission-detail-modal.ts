import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Commission } from '../../../../services/quai-peche';

@Component({
  selector: 'app-commission-detail-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './commission-detail-modal.html',
})
export class CommissionDetailModal {

  readonly item = input.required<Commission>();

  readonly closed = output<void>();

  protected formatToLocaleDateString() {
    return new Date(this.item().date).toLocaleDateString('fr-FR');
  }
}
