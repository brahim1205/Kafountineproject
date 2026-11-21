import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { Incident, IncidentsApi, IncidentStats, StatutIncident } from '../../services/incidents';

const PAGE_SIZE = 25;
const STATS_VIDES: IncidentStats = { nouveau: 0, enCours: 0, traite: 0, occurrences24h: 0 };

export const STATUTS: Record<StatutIncident, { label: string; cls: string }> = {
  nouveau: { label: 'Nouveau', cls: 'bg-red-50 text-red-700' },
  en_cours: { label: 'En cours', cls: 'bg-amber-50 text-amber-700' },
  traite: { label: 'Traité', cls: 'bg-green-50 text-green-700' },
};

/** Incidents techniques (erreurs serveur et navigateur), suivis jusqu'à leur correction. */
@Component({
  selector: 'app-incidents',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './page.html',
})
export class Incidents {
  private readonly api = inject(IncidentsApi);

  protected readonly STATUTS = STATUTS;
  protected readonly ordreStatuts: StatutIncident[] = ['nouveau', 'en_cours', 'traite'];

  protected readonly recherche = signal('');
  protected readonly rechercheDifferee = signal('');
  protected readonly filtreStatut = signal('all');
  protected readonly filtreSource = signal('all');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal('');
  protected readonly incidents = signal<Incident[]>([]);
  protected readonly stats = signal<IncidentStats>(STATS_VIDES);

  protected readonly selection = signal<Incident | null>(null);
  protected readonly statutEdite = signal<StatutIncident>('nouveau');
  protected readonly noteEditee = signal('');
  protected readonly enregistrement = signal(false);
  protected readonly erreurModale = signal('');

  private readonly rafraichir = signal(0);

  constructor() {
    effect((onCleanup) => {
      const terme = this.recherche().trim();
      const timer = setTimeout(() => this.rechercheDifferee.set(terme), 300);
      onCleanup(() => clearTimeout(timer));
    });
    effect(() => {
      this.filtreStatut();
      this.filtreSource();
      this.rechercheDifferee();
      untracked(() => this.page.set(1));
    });
    effect(() => {
      const filtre = {
        statut: this.filtreStatut(),
        source: this.filtreSource(),
        search: this.rechercheDifferee() || undefined,
        page: this.page(),
        limit: PAGE_SIZE,
      };
      this.rafraichir();
      untracked(() => void this.charger(filtre));
    });
  }

  private async charger(filtre: Parameters<IncidentsApi['list']>[0]) {
    this.chargement.set(true);
    this.erreur.set('');
    try {
      const data = await this.api.list(filtre);
      this.incidents.set(data.incidents);
      this.stats.set(data.stats);
      this.totalPages.set(data.pagination.totalPages);
    } catch {
      this.incidents.set([]);
      this.stats.set(STATS_VIDES);
      this.erreur.set('Impossible de charger les incidents.');
    } finally {
      this.chargement.set(false);
    }
  }

  protected ouvrir(incident: Incident) {
    this.selection.set(incident);
    this.statutEdite.set(incident.statut);
    this.noteEditee.set(incident.note ?? '');
    this.erreurModale.set('');
  }

  protected fermer() {
    this.selection.set(null);
  }

  protected async enregistrer() {
    const incident = this.selection();
    if (!incident) return;
    this.enregistrement.set(true);
    this.erreurModale.set('');
    try {
      await this.api.mettreAJour(incident.id, this.statutEdite(), this.noteEditee().trim());
      this.selection.set(null);
      this.rafraichir.update((n) => n + 1);
    } catch (error) {
      this.erreurModale.set(error instanceof Error ? error.message : "Impossible d'enregistrer.");
    } finally {
      this.enregistrement.set(false);
    }
  }

  protected precedente() {
    this.page.update((p) => Math.max(1, p - 1));
  }

  protected suivante() {
    this.page.update((p) => Math.min(this.totalPages(), p + 1));
  }
}
