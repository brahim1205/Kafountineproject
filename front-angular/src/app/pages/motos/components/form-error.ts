import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

@Component({
  selector: 'app-form-error',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './form-error.html',
})
export class FormError {

  readonly message = input.required<string>();
}
