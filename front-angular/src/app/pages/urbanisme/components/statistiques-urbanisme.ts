import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { YearService } from '../../../core/year/year.service';
import { UrbanismeApi, UrbanismeStats } from '../../../services/urbanisme';
import { TaxesApi, TaxService } from '../../../services/taxes';
import { Cellule, dateDuJour, exporter, FormatExport } from '../../../utils/export';
import { ExportMenu } from '../../../shared/ui/export-menu/export-menu';
import { libelleType } from './dossiers/dossiers';

const VIDE: UrbanismeStats = { total: 0, enAttente: 0, valide: 0, rejete: 0, montantTotal: 0, recettes: 0, montantEnAttente: 0, parType: [], parMois: [] };

const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

@Component({
  selector: 'app-statistiques-urbanisme',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExportMenu],
  templateUrl: './statistiques-urbanisme.html',
})
export class StatistiquesUrbanisme {
  protected readonly Math = Math;
  protected readonly yearService = inject(YearService);
  protected readonly urbanismeApi = inject(UrbanismeApi);
  private readonly taxesApi = inject(TaxesApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly showSuccessMessage = signal(false);

  protected readonly exportType = signal('');

  protected readonly loading = signal(true);

  protected readonly errorMsg = signal('');

  protected readonly stats = signal<UrbanismeStats>(VIDE);

  private readonly types = signal<TaxService[]>([]);

  protected async loadStats() {
    try {
      this.loading.set(true);
      this.errorMsg.set('');
      this.stats.set((await this.urbanismeApi.getUrbanismeStats(this.selectedYear())) || VIDE);
    } catch {
      this.stats.set(VIDE);
      this.errorMsg.set("Impossible de charger les statistiques d'urbanisme.");
    } finally {
      this.loading.set(false);
    }
  }

  protected formatMontant(montant: number) {
    return new Intl.NumberFormat('fr-FR').format(montant);
  }

  /** Dossiers déjà tranchés (validés ou rejetés). */
  protected readonly traites = computed(() => this.stats().valide + this.stats().rejete);

  /** Part des dossiers tranchés qui ont été validés. */
  protected readonly tauxValidation = computed(() => (this.traites() > 0 ? Math.round((this.stats().valide / this.traites()) * 100) : 0));

  /** Les recettes sont celles des dossiers validés : les dossiers en attente ou rejetés n'en font pas partie. */
  protected readonly cartes = computed(() => [
    { label: 'Dossiers déposés', value: this.stats().total.toString(), detail: `${this.stats().enAttente} en attente`, icon: 'ri-folder-line', fond: 'bg-teal-100', texte: 'text-teal-600' },
    { label: 'Dossiers validés', value: this.stats().valide.toString(), detail: `${this.stats().rejete} rejetés`, icon: 'ri-checkbox-circle-line', fond: 'bg-emerald-100', texte: 'text-emerald-600' },
    { label: 'Recettes enregistrées', value: `${this.formatMontant(this.stats().recettes ?? 0)} FCFA`, detail: 'dossiers validés', icon: 'ri-money-dollar-circle-line', fond: 'bg-cyan-100', texte: 'text-cyan-600' },
    { label: 'Montant en attente', value: `${this.formatMontant(this.stats().montantEnAttente ?? 0)} FCFA`, detail: 'si les dossiers sont validés', icon: 'ri-time-line', fond: 'bg-amber-100', texte: 'text-amber-600' },
  ]);

  protected readonly parType = computed(() => (this.stats().parType ?? [])
    .map((t) => ({ ...t, libelle: libelleType(t.type, this.types()) }))
    .sort((a, b) => b.total - a.total));

  protected readonly parMois = computed(() => {
    const mois = this.stats().parMois ?? [];
    const max = Math.max(1, ...mois.map((m) => m.recettes));
    return mois.map((m, i) => ({ ...m, libelle: MOIS[i] ?? m.mois, hauteur: Math.round((m.recettes / max) * 100) }));
  });

  protected handleExport(type: FormatExport) {
    const s = this.stats();
    const lignes: Cellule[][] = [
      ['Synthèse', 'Dossiers déposés', s.total],
      ['Synthèse', 'Dossiers en attente', s.enAttente],
      ['Synthèse', 'Dossiers validés', s.valide],
      ['Synthèse', 'Dossiers rejetés', s.rejete],
      ['Synthèse', 'Taux de validation des dossiers traités (%)', this.tauxValidation()],
      ['Synthèse', 'Recettes enregistrées (FCFA)', s.recettes ?? 0],
      ['Synthèse', 'Montant en attente (FCFA)', s.montantEnAttente ?? 0],
      ...this.parType().map((t): Cellule[] => ['Par type', `${t.libelle} : ${t.total} déposés, ${t.valides} validés, ${t.rejetes} rejetés (FCFA)`, t.recettes]),
      ...this.parMois().map((m): Cellule[] => ['Par mois', `${m.libelle} ${this.selectedYear()} : ${m.deposes} déposés, ${m.valides} validés (FCFA)`, m.recettes]),
    ];
    exporter(type, {
      titre: `Statistiques de l'urbanisme ${this.selectedYear()}`,
      fichier: `statistiques-urbanisme-${dateDuJour()}`,
      colonnes: ['Rubrique', 'Indicateur', 'Valeur'],
      lignes,
    });
    this.exportType.set(type);
    this.showSuccessMessage.set(true);
    setTimeout(() => this.showSuccessMessage.set(false), 3000);
  }

  constructor() {
    this.taxesApi.getTaxServices('urbanisme-habitat').then((types) => this.types.set(types)).catch(() => this.types.set([]));
    effect(() => {
      this.selectedYear();
      untracked(() => {
        this.loadStats();
      });
    });
  }
}
