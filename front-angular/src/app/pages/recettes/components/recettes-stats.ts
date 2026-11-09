import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-recettes-stats',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './recettes-stats.html',
})
export class RecettesStats {

  readonly total = input.required<number>();

  readonly count = input.required<number>();

  protected readonly cards = computed(() => [
    { label: 'Total encaissé', value: this.total().toLocaleString('fr-FR'), unit: 'FCFA' },
    { label: 'Tickets encaissés', value: this.count().toLocaleString('fr-FR'), unit: 'tickets payés' },
    { label: 'Montant moyen', value: this.count() ? Math.round(this.total() / this.count()).toLocaleString('fr-FR') : '0', unit: 'FCFA' },
    ]);
}
