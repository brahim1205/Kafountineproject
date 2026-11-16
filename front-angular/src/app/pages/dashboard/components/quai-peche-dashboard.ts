import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { YearService } from '../../../core/year/year.service';
import { Commission, QuaiPecheApi, QuaiPecheStats } from '../../../services/quai-peche';

/** Nombre de commissions en attente montrées sur l'accueil ; la liste complète est dans « Commissions ». */
const EN_ATTENTE_LIMITE = 8;

/**
 * Accueil du quai de pêche : quatre chiffres et les commissions à valider. Pêcheurs, embarcations,
 * camions, motos et marché ont chacun leur page dans le menu.
 */
@Component({
  selector: 'app-quai-peche-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './quai-peche-dashboard.html',
})
export class QuaiPecheDashboard {
  private readonly quaiPecheApi = inject(QuaiPecheApi);
  private readonly auth = inject(AuthService);
  protected readonly selectedYear = inject(YearService).selectedYear;
  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());
  protected readonly prenom = computed(() => (this.auth.userName() || '').split(' ')[0]);

  protected readonly stats = signal<QuaiPecheStats | null>(null);
  protected readonly enAttente = signal<Commission[]>([]);
  protected readonly totalEnAttente = signal(0);
  protected readonly loading = signal(true);
  protected readonly errorMsg = signal('');
  protected readonly validating = signal<string | null>(null);

  protected readonly indicateurs = computed(() => {
    const s = this.stats();
    return [
      { titre: 'Commissions', valeur: (s?.totalCommissions ?? 0).toLocaleString('fr-FR'), unite: '', icon: 'ri-snowy-line', couleur: 'bg-sky-50 text-sky-700' },
      { titre: 'Poids total', valeur: (s?.totalPoids ?? 0).toLocaleString('fr-FR'), unite: 'kg', icon: 'ri-scales-3-line', couleur: 'bg-cyan-50 text-cyan-700' },
      { titre: 'Pêcheurs actifs', valeur: (s?.totalPecheurs ?? 0).toLocaleString('fr-FR'), unite: '', icon: 'ri-user-line', couleur: 'bg-emerald-50 text-emerald-700' },
      { titre: 'En attente de validation', valeur: (s?.commissionsEnAttente ?? 0).toLocaleString('fr-FR'), unite: '', icon: 'ri-time-line', couleur: 'bg-amber-50 text-amber-700' },
    ];
  });

  constructor() {
    effect(() => {
      const year = this.selectedYear();
      untracked(() => void this.charger(year));
    });
  }

  protected async charger(year = this.selectedYear()): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const [stats, page] = await Promise.all([
        this.quaiPecheApi.getQuaiPecheStats(year),
        this.quaiPecheApi.pageCommissions({ year, page: 1, limit: EN_ATTENTE_LIMITE, statut: 'ENREGISTREE' }),
      ]);
      this.stats.set(stats || null);
      this.enAttente.set(page.data || []);
      this.totalEnAttente.set(page.meta.total);
    } catch {
      this.errorMsg.set('Impossible de charger les données du quai de pêche.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async valider(commission: Commission): Promise<void> {
    if (!this.isCurrentYear() || this.validating()) return;
    this.validating.set(commission.id);
    try {
      await this.quaiPecheApi.validateCommission(commission.id);
      await this.charger();
    } catch {
      this.errorMsg.set('Impossible de valider la commission.');
    } finally {
      this.validating.set(null);
    }
  }

  protected dateCourte(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
  }
}
