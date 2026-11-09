import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: unknown;
  footer?: unknown;
  size?: 'lg' | '2xl';
};

const SIZES = { lg: 'max-w-lg', '2xl': 'max-w-2xl' };

@Component({
  selector: 'app-footer-buttons',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './footer-buttons.html',
})
export class FooterButtons {

  readonly cancelled = output<void>();

  readonly form = input.required<string>();

  readonly submitting = input.required<boolean>();

  readonly label = input<string>('Enregistrer');
}
