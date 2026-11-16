import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { YearService } from '../../../core/year/year.service';
import { Commission, QuaiPecheApi, QuaiPecheStats } from '../../../services/quai-peche';

/** Nombre de commissions à valider montrées sur l'accueil ; les autres sont sur la page des commissions. */
const A_VALIDER_LIMITE = 10;

/** Pages du responsable du quai : l'accueil y renvoie au lieu de les recopier. */
const ACCES = [
  { label: 'Commissions', icon: 'ri-snowy-line', link: '/quai-peche/commissions' },
  { label: 'Pêcheurs', icon: 'ri-user-line', link: '/quai-peche/pecheurs' },
  { label: 'Embarcations', icon: 'ri-ship-2-line', link: '/quai-peche/embarcations' },
  { label: 'Camions', icon: 'ri-truck-line', link: '/quai-peche/camions' },
  { label: 'Motos Jakarta', icon: 'ri-motorbike-line', link: '/motos' },
  { label: 'Marché', icon: 'ri-store-2-line', link: '/marche' },
] as const;

@Component({
  selector: 'app-quai-peche-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './quai-peche-dashboard.html',
})
export class QuaiPecheDashboard {
  private readonly yearService = inject(YearService);
  private readonly auth = inject(AuthService);
  private readonly quaiPecheApi = inject(QuaiPecheApi);

  protected readonly acces = ACCES;
  protected readonly selectedYear = this.yearService.selectedYear;
  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());
  protected readonly userName = computed(() => this.auth.userName() || '');

  protected readonly loading = signal(true);
  protected readonly errorMsg = signal('');
  protected readonly quaiStats = signal<QuaiPecheStats | null>(null);
  protected readonly aValider = signal<Commission[]>([]);
  protected readonly totalAValider = signal(0);
  protected readonly enCours = signal<string | null>(null);

  protected readonly totalCommissions = computed(() => this.quaiStats()?.totalCommissions ?? 0);
  protected readonly totalPoids = computed(() => this.quaiStats()?.totalPoids ?? 0);
  protected readonly totalPecheurs = computed(() => this.quaiStats()?.totalPecheurs ?? 0);
  protected readonly commissionsEnAttente = computed(() => this.quaiStats()?.commissionsEnAttente ?? this.totalAValider());
  protected readonly resteAValider = computed(() => Math.max(0, this.totalAValider() - this.aValider().length));

  constructor() {
    effect(() => {
      const year = this.selectedYear();
      untracked(() => void this.charger(year));
    });
  }

  protected nomPecheur(item: Commission): string {
    return `${item.pecheur?.prenom || ''} ${item.pecheur?.nom || ''}`.trim() || '-';
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
  }

  protected async valider(id: string): Promise<void> {
    if (!this.isCurrentYear() || this.enCours()) return;
    this.enCours.set(id);
    this.errorMsg.set('');
    try {
      await this.quaiPecheApi.validateCommission(id);
      await this.charger(this.selectedYear());
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Impossible de valider la commission.');
    } finally {
      this.enCours.set(null);
    }
  }

  private async charger(year: number): Promise<void> {
    this.errorMsg.set('');
    try {
      const [stats, page] = await Promise.all([
        this.quaiPecheApi.getQuaiPecheStats(year).catch(() => null),
        this.quaiPecheApi.pageCommissions({ year, page: 1, limit: A_VALIDER_LIMITE, statut: 'ENREGISTREE' }),
      ]);
      if (year !== this.selectedYear()) return;
      this.quaiStats.set(stats || null);
      this.aValider.set(page.data || []);
      this.totalAValider.set(page.meta?.total ?? page.data.length);
    } catch {
      this.errorMsg.set('Impossible de charger les données du quai de pêche.');
    } finally {
      this.loading.set(false);
    }
  }
}
