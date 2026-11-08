import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/feature/Toast';
import { useYear } from '../../contexts/YearContext';
import { getReportsOverview, getTopContribuablesApi, getDetailedReportData, type ReportsOverview, type JournalEntry } from '../../services/reports';
import { downloadCsv } from '../../utils/csv';

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
  const marche = Number(overview?.marcheStats?.recettesMois || 0);
  const etatCivil = Number(overview?.etatCivilStats?.recettes || 0);
  const urbanisme = Number(overview?.urbanismeStats?.recettes || 0);
  const formations = Number(overview?.formationsStats?.budgetTotal || 0);
  const tauxRecouvrement =
    (overview?.txStats?.annee?.transactions || 0) > 0
      ? Math.round(((overview?.txStats?.annee?.transactions || 0) / (overview?.totalContribuables || 1)) * 100)
      : 0;

  return [
    {
      name: 'Taxes',
      amount: taxes,
      icon: 'ri-file-list-3-line',
      couleur: 'bg-emerald-500',
      stats: {
        transactions: overview?.txStats?.annee?.transactions || 0,
        moyenne: taxes > 0 ? Math.round(taxes / (overview?.txStats?.annee?.transactions || 1)) : 0,
        evolution: tauxRecouvrement,
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
        evolution: overview?.marcheStats?.tauxOccupation || 0,
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
        evolution: overview?.motosStats?.tauxPaiement || 0,
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
        evolution: overview?.etatCivilStats?.demandesEnAttente || 0,
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
        evolution: overview?.urbanismeStats?.dossiersValides || 0,
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
        evolution: overview?.formationsStats?.totalCertifies || 0,
      },
    },
  ];
}



export function useReportsPage() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [topContribuables, setTopContribuables] = useState<TopContribuable[]>([]);
  const [detailedJournal, setDetailedJournal] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      getReportsOverview(selectedYear), 
      getTopContribuablesApi(10, selectedYear),
      getDetailedReportData(selectedYear)
    ])
      .then(([ov, topList, journal]) => {
        if (!mounted) return;
        setOverview(ov);
        setTopContribuables(
          topList.map((t) => ({ name: `${t.prenom} ${t.nom}`.trim() || '-', amount: t.montantTotal }))
        );
        setDetailedJournal(journal);
      })
      .catch(() => {
        if (!mounted) return;
        showToast('Erreur lors du chargement des donnees des rapports.', 'error');
        setOverview(null);
        setTopContribuables([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedYear, showToast]);

  const moduleStats = useMemo(() => buildModuleStats(overview), [overview]);
  const tauxRecouvrement = useMemo(() => {
    // Calcul réel : on se base sur les contribuables inscrits ayant fait des transactions
    return (overview?.totalContribuables || 0) > 0
      ? Math.min(100, Math.round(((overview?.txStats?.annee?.transactions || 0) / (overview?.totalContribuables || 1)) * 100))
      : 0;
  }, [overview]);
  const evolutionMensuelle = useMemo(() => overview?.evolutionMensuelle || [], [overview?.evolutionMensuelle]);
  const totalExpenses = useMemo(() => {
    return detailedJournal
      .filter(item => item.amount < 0 || item.type?.toLowerCase().includes('depense'))
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  }, [detailedJournal]);

  const total = useMemo(() => moduleStats.reduce((sum, module) => sum + module.amount, 0), [moduleStats]);
  const maxMontant = useMemo(() => Math.max(...evolutionMensuelle.map((item) => item.montant), 1), [evolutionMensuelle]);

  const executiveSummary = useMemo(() => {
    if (!overview) return { pointsPositifs: [], defisIdentifies: [], recommandations: [] };
    
    const pointsPositifs = [];
    const defisIdentifies = [];
    const recommandations = [];

    // Taux de paiement motos
    const tauxMotos = overview.motosStats?.tauxPaiement || 0;
    if (tauxMotos >= 70) pointsPositifs.push(`- Taux de paiement motos excellent : ${tauxMotos}%`);
    else defisIdentifies.push(`- Faible taux de recouvrement des motos (${tauxMotos}%)`);

    // Formations
    const certifies = overview.formationsStats?.totalCertifies || 0;
    if (certifies > 0) pointsPositifs.push(`- ${certifies} jeunes ont été certifiés cette année`);
    else defisIdentifies.push(`- Aucune certification validée pour l'instant`);

    // Marché
    const occupationMarche = overview.marcheStats?.tauxOccupation || 0;
    if (occupationMarche >= 80) pointsPositifs.push(`- Forte occupation du marché central : ${occupationMarche}%`);
    else defisIdentifies.push(`- L'occupation du marché est perfectible (${occupationMarche}%)`);

    // État civil
    const enAttenteEC = overview.etatCivilStats?.demandesEnAttente || 0;
    if (enAttenteEC > 50) {
      defisIdentifies.push(`- ${enAttenteEC} demandes d'état civil en attente de traitement`);
      recommandations.push('- Accélérer le traitement des dossiers d\'état civil');
    }

    // Urbanisme
    const permisValid = overview.urbanismeStats?.dossiersValides || 0;
    if (permisValid > 0) pointsPositifs.push(`- ${permisValid} dossiers d'urbanisme traités et validés`);

    // Global
    if (pointsPositifs.length === 0) pointsPositifs.push('- L\'année vient de démarrer, les indicateurs se construisent.');
    if (defisIdentifies.length === 0) defisIdentifies.push('- Aucun défi majeur signalé.');
    
    recommandations.push('- Poursuivre la digitalisation des paiements');
    recommandations.push('- Renforcer les contrôles sur le terrain');
    recommandations.push('- Sensibiliser les contribuables aux délais');

    return { pointsPositifs, defisIdentifies, recommandations };
  }, [overview]);

  const exportCsv = () => {
    const rows = [
      ['Module', 'Montant (FCFA)', 'Evolution (%)'],
      ...moduleStats.map((module) => [module.name, String(module.amount), String(Number(module.stats.evolution || 0))]),
      ['TOTAL', String(total), ''],
    ];
    downloadCsv(`rapport-annuel-${selectedYear}.csv`, rows);
    showToast('Rapport exporte en CSV', 'success');
  };

  return {
    selectedYear,
    overview,
    loading,
    moduleStats,
    tauxRecouvrement,
    evolutionMensuelle,
    total,
    maxMontant,
    topContribuables,
    detailedJournal,
    executiveSummary,
    totalExpenses,
    exportCsv,
  };
}
