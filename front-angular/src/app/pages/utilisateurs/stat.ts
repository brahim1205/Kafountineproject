import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stat',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './stat.html',
})
export class Stat {

  readonly title = input.required<string>();

  readonly value = input.required<number>();

  readonly icon = input.required<string>();
}
