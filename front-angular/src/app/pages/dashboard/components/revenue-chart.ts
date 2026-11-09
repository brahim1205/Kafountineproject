import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

@Component({
  selector: 'app-revenue-chart',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './revenue-chart.html',
})
export class RevenueChart {
  protected readonly Math = Math;

  protected readonly data = computed(() => [
    { day: 'Lun', amount: 1800000 },
    { day: 'Mar', amount: 2100000 },
    { day: 'Mer', amount: 1950000 },
    { day: 'Jeu', amount: 2300000 },
    { day: 'Ven', amount: 2450000 },
    { day: 'Sam', amount: 2200000 },
    { day: 'Dim', amount: 1600000 }
    ]);

  protected readonly maxAmount = computed(() => Math.max(...this.data().map(d => d.amount)));
}
