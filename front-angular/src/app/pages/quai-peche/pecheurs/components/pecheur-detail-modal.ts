import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Pecheur } from '../../../../services/quai-peche';

@Component({
  selector: 'app-pecheur-detail-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './pecheur-detail-modal.html',
})
export class PecheurDetailModal {

  readonly item = input.required<Pecheur>();

  readonly closed = output<void>();
}
