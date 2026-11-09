import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { TaxCategory, TransactionStats } from '../../services/taxes';
import { YearService } from '../../core/year/year.service';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TaxesApi } from '../../services/taxes';

@Component({
  selector: 'app-taxes-page',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './page.html',
})
export class TaxesPage {
  protected readonly Number = Number;
  protected readonly Math = Math;
  protected readonly yearService = inject(YearService);
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly taxesApi = inject(TaxesApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly userRole = computed(() => this.auth.role());

  protected readonly canManage = computed(() => (this.userRole() === 'agent' || this.userRole() === 'regisseur' || this.userRole() === 'super_admin') && this.isCurrentYear());

  protected readonly canSeeStats = computed(() => this.userRole() === 'admin' || this.userRole() === 'super_admin' || this.userRole() === 'service_finances' || this.userRole() === 'regisseur');

  protected readonly periode = signal<'aujourdhui' | 'mois' | 'annee'>('annee');

  protected readonly categories = signal<TaxCategory[]>([]);

  protected readonly errorMsg = signal('');

  protected readonly stats = signal<TransactionStats>({
    aujourdhui: { total: 0, transactions: 0, categories: [] },
    mois: { total: 0, transactions: 0, categories: [] },
    annee: { total: 0, transactions: 0, categories: [] },
    });

  protected readonly selectedStats = computed(() => this.stats()[this.periode()] || { total: 0, transactions: 0, categories: [] });

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      this.selectedYear();
      const cleanup = untracked(() => (() => {
    let mounted = true;
    const empty = { total: 0, transactions: 0, categories: [] };
    this.taxesApi.getTaxCategories().then((cats) => {
    if (!mounted)
    return;
    this.errorMsg.set('');
    this.categories.set((cats || []).filter((cat) => this.userRole() !== 'regisseur' || cat.id !== 'etat-civil'));
    })
    .catch(() => {
    if (!mounted)
    return;
    this.categories.set([]);
    this.errorMsg.set('Impossible de charger les taxes.');
    });
    if (this.canSeeStats()) {
    this.taxesApi.getTransactionStats(this.selectedYear()).then((apiStats) => {
    if (!mounted)
    return;
    this.stats.set({ aujourdhui: apiStats?.aujourdhui || empty, mois: apiStats?.mois || empty, annee: apiStats?.annee || empty });
    })
    .catch(() => {
    if (mounted)
    this.stats.set({ aujourdhui: empty, mois: empty, annee: empty });
    });
    }
    return () => {
    mounted = false;
    };
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
