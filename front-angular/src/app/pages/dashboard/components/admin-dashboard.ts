import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { YearService } from '../../../core/year/year.service';
import { GlobalStats, StatistiquesApi } from '../../../services/statistiques';

type Indicateur = { titre: string; valeur: string; unite: string; detail: string; icon: string; couleur: string; lien?: string };

type ATraiter = { label: string; count: number; icon: string; link: string };

type JourRecettes = { libelle: string; montant: number; aujourdhui: boolean; hauteur: number };

const fcfa = (value: number) => Math.round(value).toLocaleString('fr-FR');

/**
 * Vue d'ensemble du maire (et du super administrateur) : quatre chiffres, les recettes des sept
 * derniers jours et ce qui attend une décision. Le détail reste dans les pages des modules.
 */
@Component({
  selector: 'app-admin-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  readonly titre = input('Bonjour, Monsieur le Maire');

  private readonly statistiquesApi = inject(StatistiquesApi);
  protected readonly selectedYear = inject(YearService).selectedYear;
  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());

  protected readonly stats = signal<GlobalStats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly indicateurs = computed<Indicateur[]>(() => {
    const s = this.stats();
    const impayes = s?.impayes ?? 0;
    return [
      { titre: 'Recettes du jour', valeur: fcfa(s?.recettesAujourdhui ?? 0), unite: 'FCFA', detail: `${(s?.transactionsAujourdhui ?? 0).toLocaleString('fr-FR')} ticket(s) aujourd’hui`, icon: 'ri-calendar-check-line', couleur: 'bg-emerald-50 text-emerald-700' },
      { titre: 'Recettes du mois', valeur: fcfa(s?.recettesMois ?? 0), unite: 'FCFA', detail: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), icon: 'ri-calendar-2-line', couleur: 'bg-cyan-50 text-cyan-700' },
      { titre: 'Recettes de l’année', valeur: fcfa(s?.totalRecettes ?? 0), unite: 'FCFA', detail: `Exercice ${this.selectedYear()}`, icon: 'ri-money-dollar-circle-line', couleur: 'bg-indigo-50 text-indigo-700' },
      { titre: 'Taux de recouvrement', valeur: String(s?.tauxRecouvrement ?? 0), unite: '%', detail: `Impayés : ${fcfa(impayes)} FCFA`, icon: 'ri-pie-chart-line', couleur: 'bg-amber-50 text-amber-700', lien: '/impayes' },
    ];
  });

  /** Sept derniers jours, du plus ancien à aujourd'hui (dernier élément renvoyé par le serveur). */
  protected readonly semaine = computed<JourRecettes[]>(() => {
    const jours = this.stats()?.evolutionSemaine ?? [];
    const max = Math.max(...jours.map((j) => j.montant), 1);
    return jours.map((j, index) => ({
      libelle: new Date(`${j.jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      montant: j.montant,
      aujourdhui: index === jours.length - 1,
      hauteur: Math.max(Math.round((j.montant / max) * 100), j.montant > 0 ? 4 : 0),
    }));
  });

  protected readonly totalSemaine = computed(() => fcfa(this.semaine().reduce((sum, j) => sum + j.montant, 0)));

  protected readonly aTraiter = computed<ATraiter[]>(() => {
    const s = this.stats()?.stats;
    return [
      { label: 'Demandes d’état civil', count: s?.etatCivil?.enAttente ?? 0, icon: 'ri-file-text-line', link: '/etat-civil' },
      { label: 'Dossiers d’urbanisme', count: s?.urbanisme?.enAttente ?? 0, icon: 'ri-building-line', link: '/urbanisme' },
      { label: 'Demandes de dépense', count: s?.budget?.enAttente ?? 0, icon: 'ri-bank-card-line', link: '/service-finances' },
      { label: 'Motos en retard de paiement', count: s?.motos?.enRetard ?? 0, icon: 'ri-motorbike-line', link: '/motos' },
    ];
  });

  protected readonly totalATraiter = computed(() => this.aTraiter().reduce((sum, item) => sum + item.count, 0));

  constructor() {
    effect(() => {
      const year = this.selectedYear();
      untracked(() => void this.charger(year));
    });
  }

  protected async charger(year = this.selectedYear()): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.stats.set(await this.statistiquesApi.getGlobalStats(year));
    } catch {
      this.error.set('Impossible de charger les statistiques du tableau de bord.');
    } finally {
      this.loading.set(false);
    }
  }
}
