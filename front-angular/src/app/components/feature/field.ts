import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: unknown;
  footer?: unknown;
  size?: 'lg' | '2xl';
};

const SIZES = { lg: 'max-w-lg', '2xl': 'max-w-2xl' };

@Component({
  selector: 'app-field',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './field.html',
})
export class Field {

  readonly label = input.required<string>();

  readonly required = input<boolean | undefined>(undefined);
}
