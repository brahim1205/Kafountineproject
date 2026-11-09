import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-field',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './field.html',
})
export class Field {

  readonly label = input.required<string>();

  readonly name = input.required<string>();

  readonly type = input<string>('text');

  readonly required = input<boolean | undefined>(undefined);

  readonly defaultValue = input<string | undefined>(undefined);

  readonly minLength = input<number | undefined>(undefined);

  readonly autoComplete = input<string | undefined>(undefined);
}
