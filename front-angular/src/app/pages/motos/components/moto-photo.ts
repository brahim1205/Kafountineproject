import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-moto-photo',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './moto-photo.html',
})
export class MotoPhoto {

  readonly src = input<string | null | undefined>(undefined);

  readonly alt = input.required<string>();

  readonly sizeClass = input.required<string>();

  protected readonly broken = signal(false);
}
