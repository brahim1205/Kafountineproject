import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TopContribuable } from './page';

@Component({
  selector: 'app-reports-top-contribuables-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './reports-top-contribuables-table.html',
})
export class ReportsTopContribuablesTable {

  readonly topContribuables = input.required<TopContribuable[]>();

  readonly total = input.required<number>();
}
