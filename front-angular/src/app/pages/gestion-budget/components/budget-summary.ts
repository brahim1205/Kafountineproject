import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-budget-summary',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './budget-summary.html',
})
export class BudgetSummary {

  readonly totalPrevu = input.required<number>();

  readonly totalDepenses = input.required<number>();

  protected readonly totalReste = computed(() => this.totalPrevu() - this.totalDepenses());

  protected readonly positif = computed(() => this.totalReste() >= 0);

  protected readonly cards = computed(() => [
    { label: 'Budget Total', value: this.totalPrevu(), valueClass: 'text-gray-900', icon: 'ri-money-dollar-circle-line', tone: 'bg-emerald-100 text-emerald-600' },
    { label: 'Total Dépensé', value: this.totalDepenses(), valueClass: 'text-gray-900', icon: 'ri-money-dollar-box-line', tone: 'bg-amber-100 text-amber-600' },
    {
    label: 'Reste à Disposer',
    value: this.totalReste(),
    valueClass: this.positif() ? 'text-green-600' : 'text-red-600',
    icon: 'ri-wallet-3-line',
    tone: this.positif() ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600',
    },
    ]);
}
