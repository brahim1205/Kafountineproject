import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { MarcheDetails, MarcheStats, PlaceMarche } from '../../../services/marche';
import { YearService } from '../../../core/year/year.service';
import { MarcheApi } from '../../../services/marche';
import { Cellule, dateDuJour, exporter, FormatExport } from '../../../utils/export';
import { ExportMenu } from '../../../shared/ui/export-menu/export-menu';

type ExtendedMarcheStats = MarcheStats & {
  nouveauxCommercants?: number;
  recettesEnRetard?: number;
};

type PlaceTypeStats = {
  type: string;
  nombre: number;
  montant: number;
  pourcentage: number;
};

type MonthlyMarketEvolution = {
  mois: string;
  placesOccuppees: number;
  recettes: number;
};

const EMPTY_STATS: ExtendedMarcheStats = {
  recettesMois: 0,
  placesTotales: 0,
  placesOccupees: 0,
  tauxOccupation: 0,
  nouveauxCommercants: 0,
  recettesEnRetard: 0,
};

@Component({
  selector: 'app-statistiques-marche',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExportMenu],
  templateUrl: './statistiques-marche.html',
})
export class StatistiquesMarche {
  protected readonly Math = Math;
  protected readonly yearService = inject(YearService);
  protected readonly marcheApi = inject(MarcheApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly showSuccessMessage = signal(false);

  protected readonly exportType = signal('');

  protected readonly stats = signal<ExtendedMarcheStats>(EMPTY_STATS);

  protected readonly places = signal<PlaceMarche[]>([]);

  protected readonly details = signal<MarcheDetails>({ topCommercants: [], evolutionMensuelle: [] });

  protected readonly loading = signal(true);

  protected readonly errorMsg = signal('');

  protected async loadData() {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    const [statsData, placesData, detailsData] = await Promise.all([
    this.marcheApi.getMarcheStats(this.selectedYear()),
    this.marcheApi.listPlacesMarche(this.selectedYear()),
    this.marcheApi.getMarcheDetails(this.selectedYear()),
    ]);
    this.stats.set(statsData || EMPTY_STATS);
    this.places.set(placesData || []);
    this.details.set(detailsData);
    }
    catch {
    this.stats.set(EMPTY_STATS);
    this.places.set([]);
    this.details.set({ topCommercants: [], evolutionMensuelle: [] });
    this.errorMsg.set("Impossible de charger les statistiques du marché.");
    }
    finally {
    this.loading.set(false);
    }
    }

  protected readonly placesParType = computed(() => {
    const grouped = this.places().reduce<Record<string, {
    nombre: number;
    montant: number;
    }>>((acc, place) => {
    const type = place.type || 'Autre';
    if (!acc[type]) {
    acc[type] = { nombre: 0, montant: 0 };
    }
    acc[type].nombre += 1;
    acc[type].montant += place.tarif || 0;
    return acc;
    }, {});
    const total = Object.values(grouped).reduce((sum, item) => sum + (item.montant || 0), 0);
    return Object.entries(grouped).map(([type, data]): PlaceTypeStats => ({
    type,
    nombre: data.nombre,
    montant: data.montant,
    pourcentage: total > 0 ? Math.round((data.montant / total) * 100) : 0,
    }));
    });

  protected readonly topCommercants = computed(() => this.details().topCommercants);

  protected readonly evolutionMensuelle = computed(() => {
    const mois: MonthlyMarketEvolution[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const row = this.details().evolutionMensuelle.find((item) => item.mois === key);
    mois.push({
    mois: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    placesOccuppees: row?.places || 0,
    recettes: row?.montant || 0,
    });
    }
    return mois;
    });

  protected handleExport(type: FormatExport) {
    const s = this.stats();
    const lignes: Cellule[][] = [
    ['Synthèse', 'Recettes du mois (FCFA)', s.recettesMois ?? 0],
    ['Synthèse', 'Places occupées', `${s.placesOccupees ?? 0} / ${s.placesTotales ?? 0}`],
    ['Synthèse', "Taux d'occupation (%)", s.tauxOccupation ?? 0],
    ['Synthèse', 'Nouveaux commerçants', s.nouveauxCommercants ?? 0],
    ['Synthèse', 'Recettes en retard (FCFA)', s.recettesEnRetard ?? 0],
    ...this.placesParType().map((t): Cellule[] => ['Places par type', `${t.type} (${t.nombre} places, ${t.pourcentage} %)`, t.montant]),
    ...this.evolutionMensuelle().map((m): Cellule[] => ['Évolution mensuelle', `${m.mois} (${m.placesOccuppees} places)`, m.recettes]),
    ...this.topCommercants().map((c): Cellule[] => ['Meilleurs commerçants', `${c.nom} · ${c.place} (${c.paiements} paiements)`, c.montant]),
    ];
    exporter(type, { titre: `Statistiques du marché ${this.selectedYear()}`, fichier: `statistiques-marche-${dateDuJour()}`, colonnes: ['Rubrique', 'Libellé', 'Valeur'], lignes });
    this.exportType.set(type);
    this.showSuccessMessage.set(true);
    setTimeout(() => {
    this.showSuccessMessage.set(false);
    }, 3000);
    }

  protected formatMontant(montant: number) {
    return new Intl.NumberFormat('fr-FR').format(montant);
    }

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.loadData();
      });
    });
  }
}
