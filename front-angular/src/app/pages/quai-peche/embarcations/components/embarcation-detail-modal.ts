import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Embarcation } from '../../../../services/quai-peche';

@Component({
  selector: 'app-embarcation-detail-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './embarcation-detail-modal.html',
})
export class EmbarcationDetailModal {

  readonly item = input.required<Embarcation>();

  readonly closed = output<void>();
}
