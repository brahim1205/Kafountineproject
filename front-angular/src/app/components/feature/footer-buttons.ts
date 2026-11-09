import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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
