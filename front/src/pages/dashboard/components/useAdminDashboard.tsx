import { useEffect, useState } from 'react';
import { useYear } from '../../../contexts/YearContext';
import { getGlobalStats, type GlobalStats, type TopAgent, type EvolutionJour, type TransactionRecente } from '../../../services/statistiques';


export const periodes = ['Aujourd\'hui', 'Cette semaine', 'Ce mois'] as const;

export interface FormattedTransaction {
  id: string;
  type: string;
  contribuable: string;
  agent: string;
  montant: number;
  heure: string;
  statut: string;
}

export function useAdminDashboard() {
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodeActive, setPeriodeActive] = useState<number>(0);
  const [transactionsRecentes, setTransactionsRecentes] = useState<FormattedTransaction[]>([]);
  const [agentsTop, setAgentsTop] = useState<TopAgent[]>([]);
  const [evolutionSemaine, setEvolutionSemaine] = useState<EvolutionJour[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getGlobalStats(selectedYear);
        setStats(data);
        
        // Charger les transactions récentes depuis l'API
        if (data?.transactionsRecentes) {
          const formattedTransactions = data.transactionsRecentes.map((tx: TransactionRecente) => ({
            id: tx.numero || tx.id,
            type: tx.type || tx.categorie || 'Transaction',
            contribuable: tx.contribuable ? `${tx.contribuable.prenom || ''} ${tx.contribuable.nom || ''}`.trim() : tx.contribuableNom || '-',
            agent: tx.agent ? `${tx.agent.prenom || ''} ${tx.agent.nom || ''}`.trim() : '-',
            montant: tx.montant || 0,
            heure: tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
            statut: tx.statut?.toLowerCase() || 'completed'
          }));
          setTransactionsRecentes(formattedTransactions);
        }
        
        // Charger les top agents depuis l'API
        if (data?.topAgents) {
          const formattedAgents = data.topAgents.map((agent) => ({
            nom: `${agent.prenom || ''} ${agent.nom || ''}`.trim(),
            collecte: agent.collecte || 0,
            transactions: agent.transactions || 0,
            initiales: agent.initiale || (agent.nom ? agent.nom[0] : '?')
          }));
          setAgentsTop(formattedAgents);
        }
        
        // Charger l'évolution de la semaine depuis l'API
        if (data?.evolutionSemaine) {
          setEvolutionSemaine(data.evolutionSemaine);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [selectedYear]);

  if (loading || error) return { pending: true as const, loading, error };

  const getRecettesValue = () => {
    switch (periodeActive) {
      case 0: return stats?.recettesAujourdhui || 0;
      case 1: return stats?.evolutionSemaine?.reduce((s, e) => s + e.montant, 0) || 0;
      case 2: return stats?.recettesMois || 0;
      default: return 0;
    }
  };

  const getTransactionsValue = () => {
    switch (periodeActive) {
      case 0: return stats?.transactionsAujourdhui || 0;
      case 1: return Math.round((stats?.transactionsMois || 0) / 4);
      case 2: return stats?.transactionsMois || 0;
      default: return 0;
    }
  };

  const statsData = [
    { 
      title: periodeActive === 0 ? 'Recettes du jour' : periodeActive === 1 ? 'Recettes semaine' : 'Recettes du mois', 
      value: (getRecettesValue() / 1000).toFixed(0), 
      unit: 'KFCFA', 
      change: periodeActive === 0 ? '+12.5%' : periodeActive === 1 ? '+8.2%' : '+15.3%', 
      trend: 'up', 
      icon: 'ri-money-dollar-circle-line', 
      color: 'bg-emerald-50 text-emerald-600' 
    },
    { 
      title: periodeActive === 0 ? 'Transactions (Jour)' : periodeActive === 1 ? 'Transactions (Sem)' : 'Transactions (Mois)', 
      value: getTransactionsValue().toString(), 
      unit: 'tickets', 
      change: periodeActive === 0 ? '+18' : periodeActive === 1 ? '+42' : '+156', 
      trend: 'up', 
      icon: 'ri-file-list-3-line', 
      color: 'bg-emerald-50 text-emerald-600' 
    },
    { 
      title: 'Contribuables', 
      value: stats?.totalContribuables?.toString() || '0', 
      unit: 'inscrits', 
      change: '+5%', 
      trend: 'up', 
      icon: 'ri-team-line', 
      color: 'bg-cyan-50 text-cyan-600' 
    },
    { 
      title: 'Taux recouvrement', 
      value: stats?.tauxRecouvrement?.toFixed(1) || '0', 
      unit: '%', 
      change: '+1.8%', 
      trend: 'up', 
      icon: 'ri-pie-chart-line', 
      color: 'bg-amber-50 text-amber-600' 
    },
  ];

  const totalCategories = stats?.categories?.reduce((sum, cat) => sum + (cat.montant || 0), 0) || 0;

  const modulesRecettes = stats?.categories?.map((cat, idx: number) => {
    const colors = ['bg-emerald-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-400'];
    const icons = ['ri-file-list-3-line', 'ri-store-2-line', 'ri-motorbike-line', 'ri-file-text-line', 'ri-building-line'];
    return {
      nom: cat.categorie,
      montant: cat.montant,
      pct: totalCategories > 0 ? Math.round(((cat.montant || 0) / totalCategories) * 100) : 0,
      icon: icons[idx % icons.length],
      barColor: colors[idx % colors.length],
    };
  }) || [];

  const maxEvol = Math.max(...evolutionSemaine.map(e => e.montant), 1);

  const displayAgentsTop = agentsTop;

  const validations = [
    {
      label: 'État civil',
      count: stats?.stats?.etatCivil?.enAttente || 0,
      icon: 'ri-file-text-line',
      link: '/etat-civil',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      label: 'Urbanisme',
      count: stats?.stats?.urbanisme?.enAttente || 0,
      icon: 'ri-building-line',
      link: '/urbanisme',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      label: 'Budget',
      count: stats?.stats?.budget?.enAttente || 0,
      icon: 'ri-bank-card-line',
      link: '/service-finances',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Quai de pêche',
      count: stats?.stats?.quaiPeche?.enAttente || 0,
      icon: 'ri-ship-line',
      link: '/quai-peche/commissions',
      color: 'bg-sky-50 text-sky-700 border-sky-200',
    },
  ];

  const alertes = stats?.alertes?.length
    ? stats.alertes.map((alerte) => ({
        message: alerte.message,
        type: alerte.type === 'danger' || alerte.type === 'warning' ? alerte.type : 'info',
        date: alerte.timestamp ? new Date(alerte.timestamp).toLocaleString('fr-FR') : 'À l’instant',
        icon:
          alerte.type === 'danger'
            ? 'ri-alert-line'
            : alerte.type === 'warning'
              ? 'ri-error-warning-line'
              : 'ri-information-line',
      }))
    : [
        { message: `En attente de validation: ${stats?.stats?.etatCivil?.enAttente || 0} dossiers d'état civil`, type: 'info', date: 'À l’instant', icon: 'ri-file-chart-line' },
        { message: `${stats?.stats?.motos?.enRetard || 0} motos en retard de paiement depuis plus de 30 jours`, type: 'danger', date: 'À l’instant', icon: 'ri-motorbike-line' },
      ];

  const raccourcis = [
    { label: 'Recettes', icon: 'ri-money-dollar-circle-line', link: '/recettes', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
    { label: 'Taxes', icon: 'ri-file-list-3-line', link: '/taxes', color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
    { label: 'État Civil', icon: 'ri-file-text-line', link: '/etat-civil', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
    { label: 'Urbanisme', icon: 'ri-building-line', link: '/urbanisme', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
    { label: 'Marché', icon: 'ri-store-2-line', link: '/marche', color: 'bg-sky-50 text-sky-600 hover:bg-sky-100' },
    { label: 'Motos', icon: 'ri-motorbike-line', link: '/motos', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
    { label: 'Rapports', icon: 'ri-bar-chart-box-line', link: '/rapports', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
  ];


  return { pending: false as const, alertes, displayAgentsTop, evolutionSemaine, isCurrentYear, maxEvol, modulesRecettes, periodeActive, raccourcis, selectedYear, setPeriodeActive, stats, statsData, transactionsRecentes, validations };
}
