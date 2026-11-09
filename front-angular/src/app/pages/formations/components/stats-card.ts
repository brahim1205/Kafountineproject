import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stats-card',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './stats-card.html',
})
export class StatsCard {

  readonly icon = input.required<string>();

  readonly label = input.required<string>();

  readonly value = input.required<string>();

  readonly bgColor = input.required<string>();

  readonly iconColor = input.required<string>();
}
