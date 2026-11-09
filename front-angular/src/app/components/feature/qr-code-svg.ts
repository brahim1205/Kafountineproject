import { ChangeDetectionStrategy, Component, computed, inject, input, resource } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import QRCode from 'qrcode';

/** Code QR vectoriel, généré dans le navigateur. */
@Component({
  selector: 'app-qr-code-svg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="block" [style.width.px]="size()" [style.height.px]="size()" [innerHTML]="markup()"></span>`,
})
export class QRCodeSVG {
  private readonly sanitizer = inject(DomSanitizer);
  readonly value = input.required<string>();
  readonly size = input(128);
  readonly level = input<'L' | 'M' | 'Q' | 'H'>('L');
  readonly includeMargin = input(false);
  readonly fgColor = input('#000000');

  private readonly svg = resource({
    params: () => ({ value: this.value(), level: this.level(), size: this.size(), margin: this.includeMargin(), color: this.fgColor() }),
    loader: ({ params }) => QRCode.toString(params.value, { type: 'svg', errorCorrectionLevel: params.level, margin: params.margin ? 4 : 0, width: params.size, color: { dark: params.color, light: '#ffffff' } }),
  });

  protected readonly markup = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.svg.value() ?? ''));
}
