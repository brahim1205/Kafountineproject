import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/feature/DashboardLayout';
import {
  getTaxCategories,
  getTransactionStats,
  type TaxCategory,
  type TransactionStats,
} from '../../services/taxes';
import { getStoredUserRole } from '../../services/auth';
import { useYear } from '../../contexts/YearContext';

export default function TaxesPage() {
  const navigate = useNavigate();
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userRole = getStoredUserRole() || 'admin';
  const canManage = userRole !== 'super_admin' && userRole !== 'comptable' && isCurrentYear;
  const [periode, setPeriode] = useState<'aujourdhui' | 'mois' | 'annee'>('annee');
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState<TransactionStats>({
    aujourdhui: { total: 0, transactions: 0, categories: [] },
    mois: { total: 0, transactions: 0, categories: [] },
    annee: { total: 0, transactions: 0, categories: [] },
  });

  useEffect(() => {
    let mounted = true;

    Promise.all([getTaxCategories(), getTransactionStats(selectedYear)])
      .then(([cats, apiStats]) => {
        if (!mounted) return;
        setErrorMsg('');
        setCategories(cats || []);
        setStats({
          aujourdhui: apiStats?.aujourdhui || { total: 0, transactions: 0, categories: [] },
          mois: apiStats?.mois || { total: 0, transactions: 0, categories: [] },
          annee: apiStats?.annee || { total: 0, transactions: 0, categories: [] },
        });
      })
      .catch(() => {
        if (!mounted) return;
        setCategories([]);
        setStats({
          aujourdhui: { total: 0, transactions: 0, categories: [] },
          mois: { total: 0, transactions: 0, categories: [] },
          annee: { total: 0, transactions: 0, categories: [] },
        });
        setErrorMsg("Impossible de charger les taxes.");
      });

    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  const selectedStats = stats[periode] || { total: 0, transactions: 0, categories: [] };

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
            <h1 className="text-2xl font-bold text-gray-900">Taxes Municipales</h1>
            <p className="text-sm text-gray-600 mt-1">Gestion des 8 catégories de taxes selon l'arrêté du 08 mai 2024</p>
          </div>
          {canManage && (
            <button
              onClick={() => navigate('/taxes/nouvelle-transaction')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/30 whitespace-nowrap"
            >
              <i className="ri-add-line text-lg"></i>
              Nouvelle transaction
            </button>
          )}
        </div>

        {/* Statistiques */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Statistiques des recettes</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriode('annee')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  periode === 'annee'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Année {selectedYear}
              </button>
              <button
                onClick={() => setPeriode('mois')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  periode === 'mois'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Ce mois
              </button>
              <button
                onClick={() => setPeriode('aujourdhui')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  periode === 'aujourdhui'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Aujourd'hui
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total des recettes</p>
                  <p className="text-3xl font-bold text-emerald-700">{Number(selectedStats.total || 0).toLocaleString()} FCFA</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <i className="ri-money-dollar-circle-line text-2xl text-emerald-600"></i>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nombre de transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{Number(selectedStats.transactions || 0)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <i className="ri-file-list-3-line text-xl text-gray-600"></i>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Répartition par catégorie</h3>
              <div className="space-y-2">
                {(selectedStats.categories || []).map((cat, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{cat.nom}</span>
                      <span className="font-medium text-gray-900">{cat.montant.toLocaleString()} FCFA</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(cat.pourcentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Catégories de taxes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Catégories de taxes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((categorie) => (
              <button
                key={categorie.id}
                onClick={() => navigate(`/taxes/${categorie.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-emerald-300 transition-all text-left group"
              >
                <div className={`w-12 h-12 rounded-lg bg-${categorie.color}-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <i className={`${categorie.icon} text-2xl text-${categorie.color}-600`}></i>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{categorie.nom}</h3>
                <p className="text-sm text-gray-600 mb-3">{categorie.description}</p>
                <div className="flex items-center text-sm text-emerald-600 font-medium">
                  <span>Voir services</span>
                  <i className="ri-arrow-right-line ml-2"></i>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
