import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { FormatExport } from '../../../utils/export';

/** Bouton « Exporter » : l'utilisateur choisit le format, PDF ou Excel. */
@Component({
  selector: 'app-export-menu',
  host: { class: 'relative inline-block', '(document:click)': 'fermerSiDehors($event)', '(keydown.escape)': 'ouvert.set(false)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" [disabled]="disabled() || busy()" (click)="ouvert.set(!ouvert())" [attr.aria-expanded]="ouvert()" aria-haspopup="menu"
      [class]="'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ' + (primary() ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')">
      <i [class]="busy() ? 'ri-loader-4-line animate-spin' : 'ri-download-line'" aria-hidden="true"></i>{{ busy() ? 'Export en cours…' : label() }}
      <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
    </button>
    @if (ouvert()) {
      <div role="menu" class="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
        <button type="button" role="menuitem" (click)="choisir('pdf')" class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
          <i class="ri-file-pdf-2-line text-lg text-red-600" aria-hidden="true"></i>Fichier PDF
        </button>
        <button type="button" role="menuitem" (click)="choisir('excel')" class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
          <i class="ri-file-excel-2-line text-lg text-emerald-700" aria-hidden="true"></i>Fichier Excel
        </button>
      </div>
    }
  `,
})
export class ExportMenu {
  private readonly hote = inject(ElementRef<HTMLElement>);

  readonly label = input('Exporter');

  readonly primary = input(false);

  readonly disabled = input(false);

  readonly busy = input(false);

  readonly exporter = output<FormatExport>();

  protected readonly ouvert = signal(false);

  protected choisir(format: FormatExport): void {
    this.ouvert.set(false);
    this.exporter.emit(format);
  }

  protected fermerSiDehors(event: Event): void {
    if (this.ouvert() && !this.hote.nativeElement.contains(event.target as Node)) this.ouvert.set(false);
  }
}
