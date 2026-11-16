import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { UiRole } from '../../core/auth/auth.models';
import { roleLabels } from '../../layout/menu';
import { ActiviteAgents, CaisseApi, PeriodeActivite } from '../../services/caisse';
import { getErrorMessage } from '../../shared/utils/form-validation';

const aujourdhui = () => new Date().toISOString().slice(0, 10);

const PERIODES: { id: PeriodeActivite; label: string }[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
];

/**
 * Activité des agents (admin, super admin, régisseur) : ce que chaque agent a enregistré sur le jour,
 * la semaine ou le mois, module par module. Le régisseur ne voit pas l'état civil.
 */
@Component({
  selector: 'app-activite-agents',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page.html',
})
export class ActiviteAgentsPage {
  private readonly api = inject(CaisseApi);

  protected readonly periodes = PERIODES;
  protected readonly maxDate = aujourdhui();
  protected readonly periode = signal<PeriodeActivite>('jour');
  protected readonly date = signal(aujourdhui());
  protected readonly activite = signal<ActiviteAgents | null>(null);
  protected readonly loading = signal(true);
  protected readonly erreur = signal('');

  /** Libellé de la période affichée : « lundi 16 novembre 2026 », « du 16 au 22 novembre 2026 », « novembre 2026 ». */
  protected readonly libellePeriode = computed(() => {
    const a = this.activite();
    if (!a) return '';
    const debut = new Date(`${a.debut}T12:00:00`);
    const fin = new Date(`${a.fin}T12:00:00`);
    if (a.periode === 'jour') return debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (a.periode === 'mois') return debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return `du ${debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  });

  constructor() {
    effect(() => {
      const periode = this.periode();
      const date = this.date();
      untracked(() => void this.charger(periode, date));
    });
  }

  protected async charger(periode = this.periode(), date = this.date()): Promise<void> {
    this.loading.set(true);
    this.erreur.set('');
    try {
      this.activite.set(await this.api.activite(periode, date));
    } catch (error) {
      this.activite.set(null);
      this.erreur.set(getErrorMessage(error, "Impossible de charger l'activité des agents."));
    } finally {
      this.loading.set(false);
    }
  }

  protected changerDate(value: string): void {
    if (value) this.date.set(value);
  }

  protected montant(value: number): string {
    return Math.round(value).toLocaleString('fr-FR');
  }

  protected libelleRole(role: string): string {
    return roleLabels[role.toLowerCase() as UiRole] ?? role;
  }
}
