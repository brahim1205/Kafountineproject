import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

export const PRIMARY_BUTTON = 'inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60';

@Component({
  selector: 'app-label',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './label.html',
})
export class Label {

  readonly required = input<boolean | undefined>(undefined);
}
