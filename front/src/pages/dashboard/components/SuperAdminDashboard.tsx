
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useYear } from '../../../contexts/YearContext';
import { getGlobalStats, type GlobalStats, type TopAgent, type EvolutionJour, type TransactionRecente } from '../../../services/statistiques';
import { getStoredUserName } from '../../../services/auth';

const periodes = ['Aujourd\'hui', 'Cette semaine', 'Ce mois'] as const;

type DashboardTransaction = {
  id: string;
  type: string;
  contribuable: string;
  agent: string;
  montant: number;
  heure: string;
  statut: string;
};

type DashboardTopAgent = TopAgent & {
  nom: string;
  initiale?: string;
};

export default function SuperAdminDashboard() {
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodeActive, setPeriodeActive] = useState<number>(0);
  const [transactionsRecentes, setTransactionsRecentes] = useState<DashboardTransaction[]>([]);
  const [agentsTop, setAgentsTop] = useState<DashboardTopAgent[]>([]);
  const [evolutionSemaine, setEvolutionSemaine] = useState<EvolutionJour[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const userName = getStoredUserName() || 'Super Administrateur';

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const data = await getGlobalStats(selectedYear);
        setStats(data);
        
        if (data?.transactionsRecentes) {
          const formattedTransactions = data.transactionsRecentes.map((tx: TransactionRecente & { type?: string; categorie?: string; createdAt?: string; statut?: string; contribuableNom?: string }) => ({
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
        
        if (data?.topAgents) {
          const formattedAgents = data.topAgents.map((agent) => ({
            nom: `${agent.prenom || ''} ${agent.nom || ''}`.trim(),
            collecte: agent.collecte || 0,
            transactions: agent.transactions || 0,
            initiale: agent.initiale || (agent.nom ? agent.nom[0] : '?')
          }));
          setAgentsTop(formattedAgents);
        }
        
        if (data?.evolutionSemaine) {
          setEvolutionSemaine(data.evolutionSemaine);
        }
      } catch {
        setStats(null);
        setTransactionsRecentes([]);
        setAgentsTop([]);
        setEvolutionSemaine([]);
        setErrorMsg("Impossible de charger les statistiques du tableau de bord.");
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  const statsData = [
    { 
      title: 'Recettes du jour', 
      value: stats?.recettesAujourdhui ? (stats.recettesAujourdhui / 1000).toFixed(0) : '0', 
      unit: 'KFCFA', 
      change: '+12.5%', 
      trend: 'up', 
      icon: 'ri-money-dollar-circle-line', 
      color: 'bg-purple-50 text-purple-600' 
    },
    { 
      title: 'Transactions', 
      value: stats?.transactionsAujourdhui?.toString() || '0', 
      unit: 'tickets', 
      change: '+18', 
      trend: 'up', 
      icon: 'ri-file-list-3-line', 
      color: 'bg-purple-50 text-purple-600' 
    },
    { 
      title: 'Contribuables', 
      value: stats?.totalContribuables?.toString() || '0', 
      unit: 'inscrits', 
      change: '+5', 
      trend: 'up', 
      icon: 'ri-user-line', 
      color: 'bg-purple-50 text-purple-600' 
    },
    { 
      title: 'Taux de recouvrement', 
      value: stats?.tauxRecouvrement ? stats.tauxRecouvrement.toFixed(1) : '0', 
      unit: '%', 
      change: '+2.3%', 
      trend: 'up', 
      icon: 'ri-percent-line', 
      color: 'bg-purple-50 text-purple-600' 
    },
  ];

  const maxMontant = Math.max(...evolutionSemaine.map(e => e.montant), 1);
  const totalCategories = stats?.categories?.reduce((sum, module) => sum + (module.montant || 0), 0) || 0;
  const modulesRecettes = stats?.categories?.map((module, index: number) => {
    const colors = ['bg-teal-500', 'bg-cyan-500', 'bg-orange-500', 'bg-amber-500', 'bg-rose-500'];
    return {
      nom: module.categorie,
      montant: module.montant || 0,
      pourcentage: totalCategories > 0 ? Math.round(((module.montant || 0) / totalCategories) * 100) : 0,
      couleur: colors[index % colors.length],
    };
  }) || [];
  const statsFormations = [
    { label: 'Formations actives', value: String(stats?.totalFormations || 0), icon: 'ri-book-open-line', color: 'text-emerald-600' },
    { label: 'Transactions année', value: String(stats?.totalTransactions || 0), icon: 'ri-file-list-3-line', color: 'text-blue-600' },
    { label: 'Recettes mois', value: `${Math.round((stats?.recettesMois || 0) / 1000)}K`, icon: 'ri-award-line', color: 'text-purple-600' },
    { label: 'Taux recouvrement', value: `${stats?.tauxRecouvrement || 0}%`, icon: 'ri-percent-line', color: 'text-teal-600' },
  ];
  const statsUtilisateurs = [
    { label: 'Total utilisateurs', value: String(stats?.totalUsers || 0), icon: 'ri-team-line', color: 'text-indigo-600' },
    { label: 'Administrateurs', value: String(stats?.totalAdmins || 0), icon: 'ri-admin-line', color: 'text-red-600' },
    { label: 'Agents', value: String(stats?.totalAgents || 0), icon: 'ri-user-line', color: 'text-blue-600' },
    { label: 'Comptables', value: String(stats?.totalComptables || 0), icon: 'ri-calculator-line', color: 'text-green-600' },
  ];
  const validations = [
    { label: 'État civil', value: stats?.stats?.etatCivil?.enAttente || 0, icon: 'ri-file-text-line', link: '/etat-civil', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Urbanisme', value: stats?.stats?.urbanisme?.enAttente || 0, icon: 'ri-building-line', link: '/urbanisme', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { label: 'Budget', value: stats?.stats?.budget?.enAttente || 0, icon: 'ri-bank-card-line', link: '/gestion-budget', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Quai de pêche', value: stats?.stats?.quaiPeche?.enAttente || 0, icon: 'ri-ship-line', link: '/quai-peche/commissions', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  ];

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {userName.split(' ')[0]} 👋 
          </h1>
          <p className="text-gray-600 mt-1">
            Voici un apercu de la gestion municipal - <span className="font-semibold text-purple-600">Super Admin</span>
          </p>
        </div>
        {/* Badge année passée - lecture seule */}
        {!isCurrentYear && (
          <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg flex items-center gap-2">
            <i className="ri-eye-line"></i>
            <span className="text-sm font-medium">Année {selectedYear} - Consultation seule</span>
          </div>
        )}
        <div className="w-full md:w-auto overflow-x-auto">
          <div className="inline-flex min-w-max gap-2">
            {periodes.map((periode, index) => (
              <button
                key={periode}
                onClick={() => setPeriodeActive(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  periodeActive === index
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {periode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                  <span className="text-sm font-normal text-gray-500 ml-1">{stat.unit}</span>
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <i className={`${stat.icon} text-xl`}></i>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1">
              <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500">vs semaine derniere</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">À superviser</h3>
            <p className="text-sm text-gray-600 mt-1">
              {stats?.stats?.validations?.total || 0} dossiers et demandes en attente
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
            Année {selectedYear}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {validations.map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${item.color}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-2xl font-bold mt-2">{item.value}</p>
                  <p className="text-xs mt-1 opacity-80">En attente</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center">
                  <i className={`${item.icon} text-xl`}></i>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolution des recettes</h3>
          <div className="flex items-end justify-between h-48 gap-2">
            {evolutionSemaine.map((jour, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-purple-500 rounded-t-md transition-all duration-300 hover:bg-purple-600"
                  style={{ height: `${(jour.montant / maxMontant) * 100}%`, minHeight: jour.montant > 0 ? '8px' : '0' }}
                  title={`${jour.montant.toLocaleString('fr-FR')} FCFA`}
                ></div>
                <span className="text-xs text-gray-500">{jour.jour}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-600">Total semaine</span>
            <span className="font-semibold text-gray-900">
              {evolutionSemaine.reduce((acc, jour) => acc + jour.montant, 0).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Agents</h3>
          <div className="space-y-4">
            {agentsTop.slice(0, 5).map((agent, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold">
                  {agent.initiales || agent.initiale}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{agent.nom}</p>
                  <p className="text-xs text-gray-500">{agent.transactions} transactions</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{agent.collecte.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-gray-500">FCFA</p>
                </div>
              </div>
            ))}
            {agentsTop.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Aucun agent trouve</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Transactions recentes</h3>
          <Link 
            to="/recettes" 
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Voir tout
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contribuable</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Heure</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactionsRecentes.slice(0, 10).map((tx, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-mono text-gray-600">{tx.id}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{tx.type}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{tx.contribuable}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{tx.agent}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">{tx.montant.toLocaleString('fr-FR')} FCFA</td>
                  <td className="py-3 px-4 text-sm text-gray-500 text-center">{tx.heure}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.statut === 'completed' || tx.statut === 'valide'
                        ? 'bg-green-100 text-green-800'
                        : tx.statut === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {tx.statut === 'completed' || tx.statut === 'valide' ? 'Valide' : tx.statut === 'pending' ? 'En attente' : 'Annule'}
                    </span>
                  </td>
                </tr>
              ))}
              {transactionsRecentes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Aucune transaction recente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repartition par module */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Repartition des recettes par module</h3>
          <div className="space-y-4">
            {modulesRecettes.map((module, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${module.couleur}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{module.nom}</span>
                    <span className="text-sm text-gray-600">{module.montant.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${module.couleur}`} 
                      style={{ width: `${Math.min(module.pourcentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">{module.pourcentage}%</span>
              </div>
            ))}
            {modulesRecettes.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Aucune répartition disponible</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques formations</h3>
          <div className="grid grid-cols-2 gap-4">
            {statsFormations.map((stat, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <i className={`${stat.icon} text-2xl ${stat.color} mb-2`}></i>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistiques utilisateurs et autres */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilisateurs du systeme</h3>
          <div className="grid grid-cols-2 gap-4">
            {statsUtilisateurs.map((stat, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <i className={`${stat.icon} text-2xl ${stat.color} mb-2`}></i>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acces rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/utilisateurs" className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
              <i className="ri-team-line text-xl"></i>
              <span className="text-sm font-medium">Gerer utilisateurs</span>
            </Link>
            <Link to="/audit" className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
              <i className="ri-file-list-3-line text-xl"></i>
              <span className="text-sm font-medium">Journal audit</span>
            </Link>
            <Link to="/parametres" className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
              <i className="ri-settings-3-line text-xl"></i>
              <span className="text-sm font-medium">Parametres</span>
            </Link>
            <Link to="/rapports" className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
              <i className="ri-bar-chart-box-line text-xl"></i>
              <span className="text-sm font-medium">Rapports</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
