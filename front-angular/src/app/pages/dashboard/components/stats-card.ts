import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-stats-card',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './stats-card.html',
})
export class StatsCard {

  readonly title = input.required<string>();

  readonly value = input.required<string>();

  readonly unit = input.required<string>();

  readonly change = input.required<string>();

  readonly trend = input.required<'up' | 'down' | 'neutral'>();

  readonly icon = input.required<string>();

  readonly color = input.required<'teal' | 'emerald' | 'cyan' | 'sky'>();

  protected readonly colorClasses = computed(() => ({
    teal: 'bg-emerald-50 text-emerald-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    sky: 'bg-sky-50 text-sky-600'
    }));

  protected readonly trendColors = computed(() => ({
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
    }));

  protected readonly trendIcons = computed(() => ({
    up: 'ri-arrow-up-line',
    down: 'ri-arrow-down-line',
    neutral: 'ri-subtract-line'
    }));
}
