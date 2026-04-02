import { useState, useEffect } from 'react';
import { useYear } from '../../../contexts/YearContext';
import { getGlobalStats, type GlobalStats, type TopAgent, type EvolutionJour, type TransactionRecente } from '../../../services/statistiques';
import { apiRequest } from '../../../services/api';
import { getStoredUserName } from '../../../services/auth';

type BudgetStats = {
  totalPrevu: number;
  totalDepense: number;
  totalReste: number;
  tauxExecution: number;
};

type BudgetLine = {
  id: string;
  code: string;
  libelle: string;
  prevu: number;
  depense: number;
};

type MotosStats = {
  penalitesEnCours: number;
  montantEnRetard: number;
};

type MarcheStats = {
  recettesEnRetard: number;
};

type ModuleRevenue = {
  module: string;
  montant: number;
  pourcentage: number;
  icon: string;
  color: string;
};

type AgentPerformance = {
  nom: string;
  collecte: number;
  objectif: number;
  transactions: number;
  initiales: string;
};

type MonthlyEvolution = {
  mois: string;
  recettes: number;
};

export default function ComptableDashboard() {
  const [periodeActive, setPeriodeActive] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [budgetStats, setBudgetStats] = useState<BudgetStats | null>(null);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [motosStats, setMotosStats] = useState<MotosStats | null>(null);
  const [marcheStats, setMarcheStats] = useState<MarcheStats | null>(null);
  const [recettesParModule, setRecettesParModule] = useState<ModuleRevenue[]>([]);
  const [agentsPerformance, setAgentsPerformance] = useState<AgentPerformance[]>([]);
  const [evolutionMensuelle, setEvolutionMensuelle] = useState<MonthlyEvolution[]>([]);
  const [transactionsRecentes, setTransactionsRecentes] = useState<TransactionRecente[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userName = getStoredUserName() || 'Fatou Sané';

  const periodes = ['Jour', 'Semaine', 'Mois', 'Trimestre'];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const [globalStats, budgetStatsData, budgetLinesData, motosStatsData, marcheStatsData] = await Promise.all([
          getGlobalStats(selectedYear),
          apiRequest<BudgetStats>(`/budget/stats?year=${selectedYear}`),
          apiRequest<BudgetLine[]>(`/budget/lignes?year=${selectedYear}`),
          apiRequest<MotosStats>(`/motos/statistiques?year=${selectedYear}`),
          apiRequest<MarcheStats>(`/marche/statistiques?year=${selectedYear}`),
        ]);

        setStats(globalStats);
        setBudgetStats(budgetStatsData || null);
        setBudgetLines(Array.isArray(budgetLinesData) ? budgetLinesData : []);
        setMotosStats(motosStatsData || null);
        setMarcheStats(marcheStatsData || null);

        // Recettes par module (depuis les catégories)
        if (globalStats?.categories) {
          const totalCategories = globalStats.categories.reduce((sum, cat) => sum + (cat.montant || 0), 0);
          const modules = globalStats.categories.map((cat, index: number) => {
            const colors = ['bg-teal-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-400', 'bg-gray-400'];
            const icons = ['ri-file-list-3-line', 'ri-store-2-line', 'ri-motorbike-line', 'ri-file-text-line', 'ri-building-line', 'ri-money-dollar-circle-line'];
            return {
              module: cat.categorie || 'Autres',
              montant: cat.montant || 0,
              pourcentage: totalCategories > 0 ? Math.round(((cat.montant || 0) / totalCategories) * 100) : 0,
              icon: icons[index % icons.length],
              color: colors[index % colors.length],
            };
          });
          setRecettesParModule(modules);
        }
        
        // Top agents
        if (globalStats?.topAgents) {
          const agents = globalStats.topAgents.map((agent: TopAgent) => ({
            nom: agent.nom || agent.prenom || 'Agent',
            collecte: agent.collecte || 0,
            objectif: 3000000,
            transactions: agent.transactions || 0,
            initiales: agent.initiale || (agent.nom?.[0] || 'A') + (agent.prenom?.[0] || ''),
          }));
          setAgentsPerformance(agents);
        }
        
        // Evolution hebdomadaire
        if (globalStats?.evolutionSemaine) {
          const evolution = globalStats.evolutionSemaine.map((e: EvolutionJour) => ({
            mois: e.jour,
            recettes: e.montant || 0,
          }));
          setEvolutionMensuelle(evolution);
        }
        
        // Transactions récentes
        if (globalStats?.transactionsRecentes) {
          setTransactionsRecentes(globalStats.transactionsRecentes.slice(0, 10));
        }
        
      } catch {
        // Fallback to empty data
        setStats(null);
        setRecettesParModule([]);
        setAgentsPerformance([]);
        setEvolutionMensuelle([]);
        setTransactionsRecentes([]);
        setBudgetStats(null);
        setBudgetLines([]);
        setMotosStats(null);
        setMarcheStats(null);
        setErrorMsg("Impossible de charger les données comptables.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedYear, periodeActive]);

  // Calculer les totaux
  const maxMensuel = evolutionMensuelle.length > 0 
    ? Math.max(...evolutionMensuelle.map(e => e.recettes), 1)
    : 1;

  // Alertes from database
  const alertes = stats?.alertes?.length > 0 
    ? stats.alertes.map((a: { message: string; type?: string; timestamp?: string }) => ({
        message: a.message,
        type: a.type === 'paiement' ? 'info' : a.type === 'retard' ? 'warning' : 'info',
        date: a.timestamp ? new Date(a.timestamp).toLocaleString('fr-FR') : '',
        icon: a.type === 'paiement' ? 'ri-checkbox-circle-line' : a.type === 'retard' ? 'ri-alert-line' : 'ri-information-line',
      }))
    : [];

  // Budget data - from stats or empty
  const budgetSuivi = budgetLines.map((line) => ({
    poste: `${line.code} ${line.libelle}`.trim(),
    budget: line.prevu || 0,
    depense: line.depense || 0,
    realise: line.prevu > 0 ? (line.depense / line.prevu) * 100 : 0,
  }));

  // Calculs globaux
  const totalBudget = budgetStats?.totalPrevu ?? budgetSuivi.reduce((s, b) => s + b.budget, 0);
  const totalDepense = budgetStats?.totalDepense ?? budgetSuivi.reduce((s, b) => s + b.depense, 0);
  const totalEcarts = budgetStats?.totalReste ?? (totalBudget - totalDepense);
  const tauxExecution = budgetStats?.tauxExecution ?? (totalBudget > 0 ? (totalDepense / totalBudget) * 100 : 0);

  const impayesARecouvrer = (motosStats?.montantEnRetard || motosStats?.penalitesEnCours || 0) + (marcheStats?.recettesEnRetard || 0);
  const soldeTresorerie = (stats?.totalRecettes || 0) - totalDepense;

  const indicateursFinanciers = [
    {
      label: 'Solde de trésorerie',
      valeur: soldeTresorerie,
      unite: 'FCFA',
      icon: soldeTresorerie < 0 ? 'ri-alert-line' : 'ri-safe-2-line',
      color: soldeTresorerie < 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200',
      text: soldeTresorerie < 0 ? 'text-red-700' : 'text-gray-900',
      trend: '',
      trendUp: soldeTresorerie >= 0,
    },
    { label: 'Recettes du mois', valeur: stats?.recettesMois || 0, unite: 'FCFA', icon: 'ri-arrow-up-circle-line', color: 'bg-white border border-gray-200', text: 'text-gray-900', trend: '', trendUp: true },
    { label: 'Dépenses du mois', valeur: totalDepense, unite: 'FCFA', icon: 'ri-arrow-down-circle-line', color: 'bg-white border border-gray-200', text: 'text-gray-900', trend: '', trendUp: false },
    { label: 'Impayés à recouvrer', valeur: impayesARecouvrer, unite: 'FCFA', icon: 'ri-error-warning-line', color: 'bg-white border border-gray-200', text: 'text-gray-900', trend: '', trendUp: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {userName.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-600 mt-1">Consolidation financière — Commune de Kafountine</p>
        </div>
        {/* Badge année passée - lecture seule */}
        {!isCurrentYear && (
          <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg flex items-center gap-2">
            <i className="ri-eye-line"></i>
            <span className="text-sm font-medium">Année {selectedYear} - Consultation seule</span>
          </div>
        )}
        <div className="w-full sm:w-auto overflow-x-auto">
          <div className="inline-flex min-w-max items-center gap-1 bg-gray-100 rounded-full p-1">
            {periodes.map((p, i) => (
              <button
                key={i}
                onClick={() => setPeriodeActive(i)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  periodeActive === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Indicateurs financiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {indicateursFinanciers.map((ind, idx) => (
          <div key={idx} className={`${ind.color} rounded-xl p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{ind.label}</p>
                <h3 className={`text-2xl font-bold ${ind.text}`}>{parseInt(String(ind.valeur)).toLocaleString('fr-FR')}</h3>
                <p className="text-xs text-gray-500 mt-1">{ind.unite}</p>
              </div>
              <i className={`${ind.icon} text-3xl text-gray-400`}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recettes par module */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recettes par module</h2>
          {recettesParModule.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
          ) : (
            <div className="space-y-3">
              {recettesParModule.map((module, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center flex-shrink-0`}>
                    <i className={`${module.icon} text-lg text-gray-500`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{module.module}</span>
                      <span className="text-sm font-semibold text-gray-900">{module.montant.toLocaleString()} FCA</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${module.color}`}
                        style={{ width: `${Math.min(module.pourcentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{module.pourcentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes</h2>
          <div className="space-y-3">
            {alertes.map((alerte, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  alerte.type === 'danger' ? 'bg-red-100 text-red-600' :
                  alerte.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <i className={`${alerte.icon} text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{alerte.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{alerte.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evolution mensuelle */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution des recettes</h2>
        {evolutionMensuelle.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
        ) : (
          <div className="flex items-end justify-between h-48 gap-2">
            {evolutionMensuelle.map((mois, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full relative" style={{ height: '160px' }}>
                  <div 
                    className="absolute bottom-0 w-full bg-emerald-500 rounded-t"
                    style={{ height: `${(mois.recettes / maxMensuel) * 100}%`, left: '0' }}
                    title={`Recettes: ${mois.recettes.toLocaleString()} FCA`}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 mt-2">{mois.mois}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Recettes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Performance des agents */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance des agents</h2>
          {agentsPerformance.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
          ) : (
            <div className="space-y-4">
              {agentsPerformance.map((agent, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
                    {agent.initiales}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{agent.nom}</span>
                      <span className="text-sm font-semibold text-gray-900">{agent.collecte.toLocaleString()} FCA</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${agent.collecte >= agent.objectif ? 'bg-green-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min((agent.collecte / agent.objectif) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{agent.transactions} tickets</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget suivi */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Suivi budgétaire</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            tauxExecution > 100 ? 'bg-red-100 text-red-700' :
            tauxExecution > 90 ? 'bg-amber-100 text-amber-700' :
            'bg-green-100 text-green-700'
          }`}>
            Exécution: {Math.round(tauxExecution)}%
          </span>
        </div>
        
        {/* Résumé */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Budget total</p>
            <p className="text-xl font-bold text-gray-900">{totalBudget.toLocaleString()} FCA</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Dépensé</p>
            <p className="text-xl font-bold text-gray-900">{totalDepense.toLocaleString()} FCA</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Écart</p>
            <p className={`text-xl font-bold ${totalEcarts >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalEcarts.toLocaleString()} FCA
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dépensé</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Écart</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {budgetSuivi.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucune ligne budgétaire disponible pour {selectedYear}
                  </td>
                </tr>
              )}
              {budgetSuivi.map((poste, idx) => {
                const ecart = poste.budget - poste.depense;
                const taux = poste.realise;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{poste.poste}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{poste.budget.toLocaleString()} FCA</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{poste.depense.toLocaleString()} FCA</td>
                    <td className={`px-4 py-3 text-sm ${ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ecart.toLocaleString()} FCA
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                          <div 
                            className={`h-2 rounded-full ${taux > 100 ? 'bg-red-500' : taux > 90 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(taux, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 w-12">{Math.round(taux)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
