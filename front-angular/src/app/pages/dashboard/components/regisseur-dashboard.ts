import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { YearService } from '../../../core/year/year.service';
import { ActiviteAgents, CaisseApi, Cloture, SyntheseAgent, SyntheseCaisse } from '../../../services/caisse';
import { MotoStats, MotosApi } from '../../../services/motos';
import { UserItem, UsersApi } from '../../../services/users';

const EQUIPES = [
  { role: 'AGENT', singulier: 'agent de terrain', pluriel: 'agents de terrain' },
  { role: 'QUAI_PECHE', singulier: 'agent du quai', pluriel: 'agents du quai' },
  { role: 'SERVICE_FINANCES', singulier: 'agent des finances', pluriel: 'agents des finances' },
] as const;

/** Date du jour au format AAAA-MM-JJ, en heure locale. */
function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tableau de bord du régisseur : la journée de la régie, les caisses à valider et les motos en retard. */
@Component({
  selector: 'app-regisseur-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './regisseur-dashboard.html',
})
export class RegisseurDashboard {
  private readonly yearService = inject(YearService);
  private readonly usersApi = inject(UsersApi);
  private readonly motosApi = inject(MotosApi);
  private readonly caisseApi = inject(CaisseApi);

  protected readonly selectedYear = this.yearService.selectedYear;
  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());
  protected readonly date = aujourdhui();
  protected readonly dateLisible = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  protected readonly loading = signal(true);
  protected readonly erreur = signal('');
  protected readonly users = signal<UserItem[]>([]);
  protected readonly motos = signal<MotoStats>({});
  protected readonly jour = signal<ActiviteAgents | null>(null);
  protected readonly mois = signal<ActiviteAgents | null>(null);
  protected readonly synthese = signal<SyntheseCaisse | null>(null);
  protected readonly aValider = signal<Cloture[]>([]);
  protected readonly enCours = signal<string | null>(null);

  protected readonly equipes = computed(() => EQUIPES.map((e) => {
    const n = this.users().filter((u) => u.role === e.role && u.isActive).length;
    return `${n} ${n > 1 ? e.pluriel : e.singulier}`;
  }).join(' · '));

  protected readonly agentsDuJour = computed(() => this.synthese()?.agents ?? []);

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => void this.charger());
    });
  }

  protected fcfa(value: number | undefined | null): string {
    return `${Math.round(Number(value || 0)).toLocaleString('fr-FR')} FCFA`;
  }

  protected etatCaisse(agent: SyntheseAgent): { texte: string; classe: string } {
    if (agent.cloture?.statut === 'VALIDEE') return { texte: 'Validée', classe: 'text-gray-700' };
    if (agent.cloture) return { texte: 'À valider', classe: 'text-amber-700 font-medium' };
    return { texte: 'Ouverte', classe: 'text-gray-500' };
  }

  protected jourLisible(jour: string): string {
    const d = new Date(`${jour.slice(0, 10)}T12:00:00`);
    return Number.isNaN(d.getTime()) ? jour : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  protected async valider(cloture: Cloture): Promise<void> {
    if (this.enCours()) return;
    this.enCours.set(cloture.id);
    this.erreur.set('');
    try {
      await this.caisseApi.valider(cloture.id);
      await this.charger();
    } catch (err) {
      this.erreur.set(err instanceof Error ? err.message : 'La caisse n’a pas pu être validée.');
    } finally {
      this.enCours.set(null);
    }
  }

  private async charger(): Promise<void> {
    const [users, motos, jour, mois, synthese, aValider] = await Promise.all([
      this.usersApi.listUsers().catch(() => []),
      this.motosApi.getMotosStats(this.selectedYear()).catch(() => ({})),
      this.caisseApi.activite('jour', this.date).catch(() => null),
      this.caisseApi.activite('mois', this.date).catch(() => null),
      this.caisseApi.synthese(this.date).catch(() => null),
      this.caisseApi.clotures('CLOTUREE', 10).catch(() => null),
    ]);
    this.users.set(users);
    this.motos.set(motos);
    this.jour.set(jour);
    this.mois.set(mois);
    this.synthese.set(synthese);
    this.aValider.set(aValider ?? []);
    if (!jour && !synthese) this.erreur.set('Les chiffres de la régie n’ont pas pu être chargés.');
    this.loading.set(false);
  }
}
