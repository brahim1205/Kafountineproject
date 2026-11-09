import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-field',
  host: { class: 'block', '[class.md:col-span-2]': 'wide()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './field.html',
})
export class Field {

  readonly label = input.required<string>();

  readonly icon = input.required<string>();

  readonly required = input<boolean | undefined>(undefined);

  readonly wide = input<boolean | undefined>(undefined);
}
