import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReportsOverview } from '../../services/reports';

@Component({
  selector: 'app-reports-overview-cards',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './reports-overview-cards.html',
})
export class ReportsOverviewCards {

  readonly total = input.required<number>();

  readonly tauxRecouvrement = input.required<number>();

  readonly overview = input.required<ReportsOverview | null>();
}
