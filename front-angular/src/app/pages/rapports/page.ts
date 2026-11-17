import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { ReportsOverview, JournalEntry } from '../../services/reports';
import { downloadCsv } from '../../utils/csv';
import { ReportsOverviewCards } from './reports-overview-cards';
import { ReportsTopContribuablesTable } from './reports-top-contribuables-table';
import { ReportsJournalTable } from './reports-journal-table';
import { RapportPDF } from '../../components/feature/rapport-pdf';
import { YearService } from '../../core/year/year.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ReportsApi } from '../../services/reports';
import { FEATURES } from '../../layout/menu';

type PrimitiveStat = number | string | string[] | undefined;

export type ModuleStatRecord = Record<string, PrimitiveStat>;

export interface ModuleStat {
  name: string;
  amount: number;
  icon: string;
  couleur: string;
  stats: ModuleStatRecord;
}

export interface TopContribuable {
  name: string;
  amount: number;
}

function buildModuleStats(overview: ReportsOverview | null): ModuleStat[] {
  const taxes = Number(overview?.txStats?.annee?.total || overview?.txStats?.mois?.total || 0);
  const motos = Number(overview?.motosStats?.recettesAnnee || overview?.motosStats?.recettesMois || 0);
  const marche = Number(overview?.marcheStats?.recettesAnnee ?? overview?.marcheStats?.recettesMois ?? 0);
  const etatCivil = Number(overview?.etatCivilStats?.recettes || 0);
  const urbanisme = Number(overview?.urbanismeStats?.recettes || 0);
  const formations = Number(overview?.formationsStats?.budgetTotal || 0);
  const tauxRecouvrement =
    (overview?.txStats?.annee?.transactions || 0) > 0
      ? Math.round(((overview?.txStats?.annee?.transactions || 0) / (overview?.totalContribuables || 1)) * 100)
      : 0;

  const modules: ModuleStat[] = [
    {
      name: 'Taxes',
      amount: taxes,
      icon: 'ri-file-list-3-line',
      couleur: 'bg-emerald-500',
      stats: {
        transactions: overview?.txStats?.annee?.transactions || 0,
        moyenne: taxes > 0 ? Math.round(taxes / (overview?.txStats?.annee?.transactions || 1)) : 0,
        indicateur: `Taux de recouvrement : ${Math.min(100, tauxRecouvrement)} %`,
      },
    },
    {
      name: 'Marche',
      amount: marche,
      icon: 'ri-store-2-line',
      couleur: 'bg-cyan-500',
      stats: {
        places: overview?.marcheStats?.placesTotales || 0,
        occupancy: overview?.marcheStats?.tauxOccupation || 0,
        indicateur: `Taux d'occupation : ${overview?.marcheStats?.tauxOccupation || 0} %`,
      },
    },
    {
      name: 'Motos',
      amount: motos,
      icon: 'ri-motorbike-line',
      couleur: 'bg-orange-500',
      stats: {
        totalMotos: overview?.motosStats?.total || 0,
        tauxPaiement: overview?.motosStats?.tauxPaiement || 0,
        indicateur: `Taux de paiement : ${overview?.motosStats?.tauxPaiement || 0} %`,
      },
    },
    {
      name: 'Etat Civil',
      amount: etatCivil,
      icon: 'ri-file-text-line',
      couleur: 'bg-amber-500',
      stats: {
        actesDelivres: overview?.etatCivilStats?.demandesDelivrees || 0,
        principalesDemandes: ['Naissance', 'Mariage', 'Deces', 'Certificat'],
        indicateur: `Demandes en attente : ${overview?.etatCivilStats?.demandesEnAttente || 0}`,
      },
    },
    {
      name: 'Urbanisme',
      amount: urbanisme,
      icon: 'ri-building-line',
      couleur: 'bg-rose-500',
      stats: {
        permisDelivres: overview?.urbanismeStats?.dossiersValides || 0,
        dossiers: overview?.urbanismeStats?.totalDossiers || 0,
        indicateur: `Dossiers validés : ${overview?.urbanismeStats?.dossiersValides || 0}`,
      },
    },
    {
      name: 'Formations',
      amount: formations,
      icon: 'ri-graduation-cap-line',
      couleur: 'bg-emerald-500',
      stats: {
        jeunesFormes: overview?.formationsStats?.totalJeunesFormes || 0,
        certifications: overview?.formationsStats?.totalCertifies || 0,
        formationsActives: overview?.formationsStats?.totalFormations || 0,
        budget: formations,
        indicateur: `Certifications : ${overview?.formationsStats?.totalCertifies || 0}`,
      },
    },
  ];
  return FEATURES.formations ? modules : modules.filter((m) => m.name !== 'Formations');
}

@Component({
  selector: 'app-rapports',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReportsOverviewCards, ReportsTopContribuablesTable, ReportsJournalTable, RapportPDF],
  templateUrl: './page.html',
})
export class Rapports {
  protected readonly Number = Number;
  protected readonly Math = Math;
  protected readonly Array = Array;
  protected readonly FEATURES = FEATURES;
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly reportsApi = inject(ReportsApi);
  protected readonly showPdfPreview = signal(false);

  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly overview = signal<ReportsOverview | null>(null);

  protected readonly topContribuables = signal<TopContribuable[]>([]);

  protected readonly detailedJournal = signal<JournalEntry[]>([]);

  protected readonly loading = signal(true);

  protected readonly moduleStats = computed(() => buildModuleStats(this.overview()));

  protected readonly tauxRecouvrement = computed(() => {
    return (this.overview()?.totalContribuables || 0) > 0
    ? Math.min(100, Math.round(((this.overview()?.txStats?.annee?.transactions || 0) / (this.overview()?.totalContribuables || 1)) * 100))
    : 0;
    });

  protected readonly evolutionMensuelle = computed(() => this.overview()?.evolutionMensuelle || []);

  protected readonly totalExpenses = computed(() => {
    return this.detailedJournal().filter(item => item.amount < 0 || item.type?.toLowerCase().includes('depense'))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    });

  protected readonly total = computed(() => this.moduleStats().reduce((sum, module) => sum + module.amount, 0));

  protected readonly maxMontant = computed(() => Math.max(...this.evolutionMensuelle().map((item) => item.montant), 1));

  protected readonly executiveSummary = computed(() => {
    if (!this.overview())
    return { pointsPositifs: [], defisIdentifies: [], recommandations: [] };
    const pointsPositifs = [];
    const defisIdentifies = [];
    const recommandations = [];
    const tauxMotos = this.overview()!.motosStats?.tauxPaiement || 0;
    if (tauxMotos >= 70)
    pointsPositifs.push(`- Taux de paiement motos excellent : ${tauxMotos}%`);
    else
    defisIdentifies.push(`- Faible taux de recouvrement des motos (${tauxMotos}%)`);
    if (FEATURES.formations) {
    const certifies = this.overview()!.formationsStats?.totalCertifies || 0;
    if (certifies > 0)
    pointsPositifs.push(`- ${certifies} jeunes ont été certifiés cette année`);
    else
    defisIdentifies.push(`- Aucune certification validée pour l'instant`);
    }
    const occupationMarche = this.overview()!.marcheStats?.tauxOccupation || 0;
    if (occupationMarche >= 80)
    pointsPositifs.push(`- Forte occupation du marché central : ${occupationMarche}%`);
    else
    defisIdentifies.push(`- L'occupation du marché est perfectible (${occupationMarche}%)`);
    const enAttenteEC = this.overview()!.etatCivilStats?.demandesEnAttente || 0;
    if (enAttenteEC > 50) {
    defisIdentifies.push(`- ${enAttenteEC} demandes d'état civil en attente de traitement`);
    recommandations.push('- Accélérer le traitement des dossiers d\'état civil');
    }
    const permisValid = this.overview()!.urbanismeStats?.dossiersValides || 0;
    if (permisValid > 0)
    pointsPositifs.push(`- ${permisValid} dossiers d'urbanisme traités et validés`);
    if (pointsPositifs.length === 0)
    pointsPositifs.push('- L\'année vient de démarrer, les indicateurs se construisent.');
    if (defisIdentifies.length === 0)
    defisIdentifies.push('- Aucun défi majeur signalé.');
    recommandations.push('- Poursuivre la digitalisation des paiements');
    recommandations.push('- Renforcer les contrôles sur le terrain');
    recommandations.push('- Sensibiliser les contribuables aux délais');
    return { pointsPositifs, defisIdentifies, recommandations };
    });

  protected exportCsv() {
    const rows = [
    ['Module', 'Montant (FCFA)', 'Indicateur'],
    ...this.moduleStats().map((module) => [module.name, String(module.amount), String(module.stats.indicateur || '')]),
    ['TOTAL', String(this.total()), ''],
    ];
    downloadCsv(`rapport-annuel-${this.selectedYear()}.csv`, rows);
    this.toast.show('Rapport exporte en CSV', 'success');
    }

  protected readonly journalData = computed(() => this.detailedJournal());

  protected evolutionMensuelleSummary() {
    return this.evolutionMensuelle().reduce((s, e) => s + e.montant, 0).toLocaleString('fr-FR');
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      this.selectedYear();
      const cleanup = untracked(() => (() => {
    let mounted = true;
    this.loading.set(true);
    Promise.all([
    this.reportsApi.getReportsOverview(this.selectedYear()),
    this.reportsApi.getTopContribuablesApi(10, this.selectedYear()),
    this.reportsApi.getDetailedReportData(this.selectedYear())
    ])
    .then(([ov, topList, journal]) => {
    if (!mounted)
    return;
    this.overview.set(ov);
    this.topContribuables.set(topList.map((t) => ({ name: `${t.prenom} ${t.nom}`.trim() || '-', amount: t.montantTotal })));
    this.detailedJournal.set(journal);
    })
    .catch(() => {
    if (!mounted)
    return;
    this.toast.show('Erreur lors du chargement des donnees des rapports.', 'error');
    this.overview.set(null);
    this.topContribuables.set([]);
    })
    .finally(() => {
    if (mounted)
    this.loading.set(false);
    });
    return () => {
    mounted = false;
    };
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
