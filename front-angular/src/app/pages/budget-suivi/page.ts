import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { YearService } from '../../core/year/year.service';
import { ApiService } from '../../core/api/api.service';

type LigneBudgetaire = {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense: number;
  year: number;
};

type BudgetStats = {
  totalPrevu: number;
  totalDepense: number;
  totalReste: number;
  tauxExecution: number;
};

@Component({
  selector: 'app-budget-suivi-page',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './page.html',
})
export class BudgetSuiviPage {
  protected readonly Math = Math;
  protected readonly yearService = inject(YearService);
  protected readonly apiService = inject(ApiService);
  protected readonly stats = signal<BudgetStats | null>(null);

  protected readonly lignes = signal<LigneBudgetaire[]>([]);

  protected readonly loading = signal(true);

  protected readonly errorMsg = signal('');

  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly budgetSuivi = computed(() => this.lignes().map((ligne) => ({
    poste: ligne.libelle,
    budget: ligne.prevu,
    depense: ligne.depense,
    realise: ligne.prevu > 0 ? Math.round((ligne.depense / ligne.prevu) * 100) : 0,
    })));

  protected readonly totalBudget = computed(() => this.stats()?.totalPrevu ?? this.budgetSuivi().reduce((s, b) => s + b.budget, 0));

  protected readonly totalDepense = computed(() => this.stats()?.totalDepense ?? this.budgetSuivi().reduce((s, b) => s + b.depense, 0));

  protected readonly totalEcarts = computed(() => this.stats()?.totalReste ?? (this.totalBudget() - this.totalDepense()));

  protected readonly tauxExecution = computed(() => this.stats()?.tauxExecution ?? (this.totalBudget() > 0 ? Math.round((this.totalDepense() / this.totalBudget()) * 100) : 0));

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    const loadData = async () => {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    const [budgetStats, budgetLignes] = await Promise.all([
    this.apiService.request<BudgetStats>(`/budget/stats?year=${this.selectedYear()}`),
    this.apiService.request<LigneBudgetaire[]>(`/budget/lignes?year=${this.selectedYear()}`),
    ]);
    this.stats.set(budgetStats);
    this.lignes.set(Array.isArray(budgetLignes) ? budgetLignes : []);
    }
    catch {
    this.stats.set(null);
    this.lignes.set([]);
    this.errorMsg.set("Impossible de charger le suivi budgétaire.");
    }
    finally {
    this.loading.set(false);
    }
    };
    loadData();
      });
    });
  }
}
