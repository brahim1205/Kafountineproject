import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

const SIZES = { lg: 'max-w-lg', '2xl': 'max-w-2xl' };

@Component({
  selector: 'app-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './modal.html',
})
export class Modal {
  protected readonly SIZES = SIZES;

  readonly footerSlot = input(false);

  readonly title = input.required<string>();

  readonly closed = output<void>();

  readonly size = input<'lg' | '2xl'>('lg');
}
