import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { apiRequest } from '../../services/api';
import { useYear } from '../../contexts/YearContext';



type LigneBudgetaire = {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense: number;
  year: number;
};

type BudgetStats = {
  totalPrevu: number;
  totalDepense: number;
  totalReste: number;
  tauxExecution: number;
};

export default function BudgetSuiviPage() {

  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [lignes, setLignes] = useState<LigneBudgetaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { selectedYear } = useYear();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const [budgetStats, budgetLignes] = await Promise.all([
          apiRequest<BudgetStats>(`/budget/stats?year=${selectedYear}`),
          apiRequest<LigneBudgetaire[]>(`/budget/lignes?year=${selectedYear}`),
        ]);
        setStats(budgetStats);
        setLignes(Array.isArray(budgetLignes) ? budgetLignes : []);
      } catch {
        setStats(null);
        setLignes([]);
        setErrorMsg("Impossible de charger le suivi budgétaire.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedYear]);

  const budgetSuivi = lignes.map((ligne) => ({
    poste: ligne.libelle,
    budget: ligne.prevu,
    depense: ligne.depense,
    realise: ligne.prevu > 0 ? Math.round((ligne.depense / ligne.prevu) * 100) : 0,
  }));

  // Calculs globaux
  const totalBudget = stats?.totalPrevu ?? budgetSuivi.reduce((s, b) => s + b.budget, 0);
  const totalDepense = stats?.totalDepense ?? budgetSuivi.reduce((s, b) => s + b.depense, 0);
  const totalEcarts = stats?.totalReste ?? (totalBudget - totalDepense);
  const tauxExecution = stats?.tauxExecution ?? (totalBudget > 0 ? Math.round((totalDepense / totalBudget) * 100) : 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Chargement des données...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi Budgétaire</h1>
          <p className="text-sm text-gray-600 mt-1">Gestion des dépenses communales</p>
        </div>

      </div>

      {/* Cartans resume */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
          <p className="text-sm text-emerald-100 mb-1">Budget Total</p>
          <h3 className="text-2xl font-bold">{totalBudget.toLocaleString()} FCFA</h3>
          <p className="text-xs text-emerald-200 mt-1">Allocation annuelle</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <p className="text-sm text-amber-100 mb-1">Total Dépensé</p>
          <h3 className="text-2xl font-bold">{totalDepense.toLocaleString()} FCFA</h3>
          <p className="text-xs text-amber-200 mt-1">Dépenses effectives</p>
        </div>
        <div className={`bg-gradient-to-br ${totalEcarts >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} rounded-xl p-5 text-white`}>
          <p className="text-sm text-emerald-100 mb-1">Écart</p>
          <h3 className="text-2xl font-bold">{totalEcarts.toLocaleString()} FCFA</h3>
          <p className="text-xs text-emerald-200 mt-1">{totalEcarts >= 0 ? 'Disponible' : 'Dépassement'}</p>
        </div>
      </div>

      {/* Indicateur d'exécution */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Taux d'exécution budgétaire</h3>
          <span className="text-2xl font-bold text-emerald-600">{tauxExecution}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${tauxExecution > 100 ? 'bg-red-500' : tauxExecution > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(tauxExecution, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Détail par poste budgétaire</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Poste</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Budget</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Dépensé</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Écart</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Réalisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {budgetSuivi.map((poste, idx) => {
                const ecart = poste.budget - poste.depense;
                const taux = poste.realise;
                return (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{poste.poste}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{poste.budget.toLocaleString()} FCFA</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{poste.depense.toLocaleString()} FCFA</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ecart.toLocaleString()} FCFA
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${taux > 100 ? 'bg-red-500' : taux > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(taux, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-medium ${taux > 100 ? 'text-red-600' : taux > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {taux}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{totalBudget.toLocaleString()} FCFA</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{totalDepense.toLocaleString()} FCFA</td>
                <td className={`px-4 py-3 text-sm font-bold text-right ${totalEcarts >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalEcarts.toLocaleString()} FCFA
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-bold text-emerald-600">{tauxExecution}%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
