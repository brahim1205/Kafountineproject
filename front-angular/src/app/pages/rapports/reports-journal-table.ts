import { ChangeDetectionStrategy, Component, input, signal, computed } from '@angular/core';

interface JournalItem {
  id: string;
  date: string | Date;
  person: string;
  type: string;
  amount: number;
  description: string;
  module: string;
}

@Component({
  selector: 'app-reports-journal-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './reports-journal-table.html',
})
export class ReportsJournalTable {

  readonly journal = input.required<JournalItem[]>();

  protected readonly searchTerm = signal('');

  protected readonly filteredJournal = computed(() => this.journal().filter(item => item.person.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    item.type.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    item.description.toLowerCase().includes(this.searchTerm().toLowerCase())));

  protected getModuleBadge(module: string) {
    const configs: Record<string, {
    color: string;
    icon: string;
    }> = {
    'recettes': { color: 'bg-emerald-100 text-emerald-700', icon: 'ri-money-dollar-circle-line' },
    'etat-civil': { color: 'bg-amber-100 text-amber-700', icon: 'ri-file-text-line' },
    'urbanisme': { color: 'bg-rose-100 text-rose-700', icon: 'ri-building-line' },
    'marche': { color: 'bg-cyan-100 text-cyan-700', icon: 'ri-store-2-line' },
    'motos': { color: 'bg-orange-100 text-orange-700', icon: 'ri-motorbike-line' },
    'budget': { color: 'bg-gray-100 text-gray-700', icon: 'ri-wallet-3-line' },
    'formations': { color: 'bg-emerald-100 text-emerald-700', icon: 'ri-graduation-cap-line' },
    'jeunesse': { color: 'bg-purple-100 text-purple-700', icon: 'ri-user-line' },
    };
    const config = configs[module] || { color: 'bg-gray-100 text-gray-700', icon: 'ri-question-line' };
    return config;
    }

  protected itemDate(item: { date: string | number | Date }) {
    return new Date(item.date);
  }

  protected getFullYearSummary() {
    return new Date().getFullYear();
  }
}
