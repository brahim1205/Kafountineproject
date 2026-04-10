import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/feature/Toast';
import { useYear } from '../../contexts/YearContext';
import { exportReportPdf, openPdfBlob } from '../../services/pdf';
import { getReportsOverview, getReportTransactions, type ReportsOverview } from '../../services/reports';
import type { TransactionItem } from '../../services/taxes';

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
      couleur: 'bg-teal-500',
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

function buildTopContribuables(transactions: TransactionItem[]): TopContribuable[] {
  const map = new Map<string, number>();
  transactions.forEach((tx) => {
    const name = `${tx.contribuable?.prenom || ''} ${tx.contribuable?.nom || ''}`.trim() || '-';
    map.set(name, (map.get(name) || 0) + Number(tx.montant || 0));
  });

  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

export function useReportsPage() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([getReportsOverview(selectedYear), getReportTransactions(800, selectedYear)])
      .then(([ov, txs]) => {
        if (!mounted) return;
        setOverview(ov);
        setTransactions(txs || []);
      })
      .catch(() => {
        if (!mounted) return;
        showToast('Erreur lors du chargement des donnees des rapports.', 'error');
        setOverview(null);
        setTransactions([]);
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
    return (overview?.txStats?.annee?.transactions || 0) > 0
      ? Math.round(((overview?.txStats?.annee?.transactions || 0) / (overview?.totalContribuables || 1)) * 100)
      : 0;
  }, [overview]);
  const evolutionMensuelle = useMemo(() => overview?.evolutionSemaine || [], [overview?.evolutionSemaine]);
  const total = useMemo(() => moduleStats.reduce((sum, module) => sum + module.amount, 0), [moduleStats]);
  const maxMontant = useMemo(() => Math.max(...evolutionMensuelle.map((item) => item.montant), 1), [evolutionMensuelle]);
  const topContribuables = useMemo(() => buildTopContribuables(transactions), [transactions]);

  const exportCsv = () => {
    const rows = [
      ['Module', 'Montant (FCFA)', 'Evolution (%)'],
      ...moduleStats.map((module) => [module.name, String(module.amount), String(Number(module.stats.evolution || 0))]),
      ['TOTAL', String(total), ''],
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-annuel-${selectedYear}.csv`;
    link.click();
    showToast('Rapport exporte en CSV', 'success');
  };

  const exportPdf = async () => {
    try {
      const blob = await exportReportPdf({
        year: selectedYear,
        total,
        tauxRecouvrement,
        totalTransactions: overview?.txStats?.annee?.transactions || 0,
        totalContribuables: overview?.totalContribuables || 0,
        modules: moduleStats.map((module) => ({
          name: module.name,
          amount: module.amount,
          evolution: Number(module.stats.evolution || 0),
        })),
        topContribuables,
      });
      openPdfBlob(blob, `rapport-annuel-${selectedYear}.pdf`);
      showToast('Rapport exporté en PDF', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de générer le PDF.', 'error');
    }
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
    exportCsv,
    exportPdf,
  };
}
