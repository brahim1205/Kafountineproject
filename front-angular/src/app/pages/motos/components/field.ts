export const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Champ de formulaire libellé ; `required` s'appuie sur la validation du formulaire. */
@Component({
  selector: 'app-field',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './field.html',
})
export class Field {
  readonly label = input.required<string>();
  readonly name = input<string>();
  readonly type = input('text');
  readonly placeholder = input<string>('');
  readonly required = input(false);
  readonly className = input<string>();
  readonly min = input<number>();
  readonly max = input<number>();
  readonly INPUT_CLASS = INPUT_CLASS;
}
