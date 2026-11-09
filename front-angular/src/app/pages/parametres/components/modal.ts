import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

export const PRIMARY_BUTTON = 'inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60';

@Component({
  selector: 'app-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './modal.html',
})
export class Modal {

  readonly title = input<unknown>('');

  readonly titleSlot = input(false);

  readonly close = output<void>();

  readonly wide = input<boolean | undefined>(undefined);
}
