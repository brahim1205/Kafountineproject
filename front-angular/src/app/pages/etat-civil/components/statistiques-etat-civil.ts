import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { YearService } from '../../../core/year/year.service';
import { EtatCivilApi, EtatCivilStats, EtatCivilTypeStats } from '../../../services/etat-civil';

type Statistiques = {
  total: number;
  enAttente: number;
  delivrees: number;
  rejetees: number;
  recettes: number;
  parType: EtatCivilTypeStats[];
};

const VIDE: Statistiques = { total: 0, enAttente: 0, delivrees: 0, rejetees: 0, recettes: 0, parType: [] };

/** Statistiques de l'état civil : chiffres clés, répartition des demandes par statut et par type d'acte. */
@Component({
  selector: 'app-statistiques-etat-civil',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './statistiques-etat-civil.html',
})
export class StatistiquesEtatCivil {
  private readonly etatCivilApi = inject(EtatCivilApi);
  protected readonly selectedYear = inject(YearService).selectedYear;

  protected readonly loading = signal(true);
  protected readonly errorMsg = signal('');
  protected readonly stats = signal<Statistiques>(VIDE);

  protected readonly indicateurs = computed(() => {
    const s = this.stats();
    return [
      { label: 'Demandes reçues', valeur: this.nombre(s.total), detail: `Exercice ${this.selectedYear()}`, icon: 'ri-file-list-3-line' },
      { label: 'En attente', valeur: this.nombre(s.enAttente), detail: 'À traiter par le service', icon: 'ri-time-line' },
      { label: 'Actes délivrés', valeur: this.nombre(s.delivrees), detail: `${this.pourcentage(s.delivrees)} des demandes`, icon: 'ri-checkbox-circle-line' },
      { label: 'Recettes', valeur: `${this.nombre(s.recettes)} FCFA`, detail: 'Actes délivrés', icon: 'ri-money-dollar-circle-line' },
    ];
  });

  /** Statuts dans l'ordre de la barre de répartition ; la couleur ne porte jamais seule l'information. */
  protected readonly statuts = computed(() => {
    const s = this.stats();
    return [
      { label: 'Délivrées', nombre: s.delivrees, couleur: 'bg-emerald-600' },
      { label: 'En attente', nombre: s.enAttente, couleur: 'bg-amber-400' },
      { label: 'Rejetées', nombre: s.rejetees, couleur: 'bg-gray-400' },
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
      const r: EtatCivilStats = await this.etatCivilApi.getEtatCivilStats(year);
      this.stats.set({
        total: r.totalDemandes ?? 0,
        enAttente: r.demandesEnAttente ?? r.enAttente ?? 0,
        delivrees: r.demandesDelivrees ?? r.validees ?? 0,
        rejetees: r.demandesRejetees ?? 0,
        recettes: r.recettes ?? 0,
        parType: r.parType ?? [],
      });
    } catch {
      this.stats.set(VIDE);
      this.errorMsg.set("Impossible de charger les statistiques de l'état civil.");
    } finally {
      this.loading.set(false);
    }
  }

  protected nombre(value: number): string {
    return Math.round(value).toLocaleString('fr-FR');
  }

  protected pourcentage(part: number): string {
    const total = this.stats().total;
    return total > 0 ? `${Math.round((part / total) * 100)} %` : '0 %';
  }

  protected largeur(part: number): number {
    const total = this.stats().total;
    return total > 0 ? (part / total) * 100 : 0;
  }
}
