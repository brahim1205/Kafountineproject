import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Pied de liste paginée côté serveur : nombre total, page courante, précédent / suivant. */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 px-6 py-3 text-sm text-gray-600">
      <span>
        {{ formatted(total()) }} {{ unit() }}{{ total() > 1 ? 's' : '' }} — page {{ formatted(page()) }} sur {{ formatted(pages()) }}
      </span>
      @if (totalPages() > 1) {
        <div class="flex gap-2">
          <button type="button" (click)="go(page() - 1)" [disabled]="page() <= 1" class="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40">Précédent</button>
          <button type="button" (click)="go(page() + 1)" [disabled]="page() >= totalPages()" class="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40">Suivant</button>
        </div>
      }
    </div>
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly total = input.required<number>();
  /** Libellé des éléments comptés : « ticket », « entrée »… (au singulier). */
  readonly unit = input.required<string>();
  readonly pageChange = output<number>();

  protected readonly pages = computed(() => Math.max(1, this.totalPages()));

  protected formatted(value: number): string {
    return value.toLocaleString('fr-FR');
  }

  protected go(page: number): void {
    this.pageChange.emit(Math.min(this.totalPages(), Math.max(1, page)));
  }
}
