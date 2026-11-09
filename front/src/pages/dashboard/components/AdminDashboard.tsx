import { Link } from 'react-router-dom';
import { useAdminDashboard, periodes } from './useAdminDashboard';

export default function AdminDashboard() {
  const view = useAdminDashboard();
  if (view.pending) {
  if (view.loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Chargement des statistiques...</p>
          </div>
        </div>
      );
    }

    if (view.error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">Erreur: {view.error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  const { alertes, displayAgentsTop, evolutionSemaine, isCurrentYear, maxEvol, modulesRecettes, periodeActive, raccourcis, selectedYear, setPeriodeActive, stats, statsData, transactionsRecentes, validations } = view;
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, Mr le Maire 👋</h1>
          <p className="text-sm text-gray-600 mt-1">Vue d'ensemble de la Commune de Kafountine - Année {selectedYear}</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                  <span className="text-xs text-gray-500">{stat.unit}</span>
                </div>
                <div className={`inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  stat.trend === 'up' ? 'bg-green-50 text-green-700' : stat.trend === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  <i className={stat.trend === 'up' ? 'ri-arrow-up-line' : stat.trend === 'down' ? 'ri-arrow-down-line' : 'ri-subtract-line'}></i>
                  {stat.change}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <i className={`${stat.icon} text-2xl`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Raccourcis rapides */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Accès rapide</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {raccourcis.map((r, idx) => (
            <Link
              key={idx}
              to={r.link}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors cursor-pointer ${r.color}`}
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <i className={`${r.icon} text-2xl`}></i>
              </div>
              <span className="text-xs font-medium text-center leading-tight">{r.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">À valider</h3>
            <p className="text-sm text-gray-600 mt-1">
              {stats?.stats?.validations?.total || 0} dossiers et demandes en attente
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
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
                  <p className="text-2xl font-bold mt-2">{item.count}</p>
                  <p className="text-xs mt-1 opacity-80">En attente de validation</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center">
                  <i className={`${item.icon} text-xl`}></i>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Graphique + Répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évolution hebdomadaire */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Évolution des recettes</h3>
              <p className="text-sm text-gray-600 mt-1">Cette semaine</p>
            </div>
            <Link to="/rapports" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer whitespace-nowrap">
              Voir rapports
            </Link>
          </div>
          <div className="flex items-end gap-3 h-48">
            {evolutionSemaine.map((item, idx) => {
              const height = (item.montant / maxEvol) * 100;
              const isToday = idx === 4;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">{(item.montant / 1000000).toFixed(1)}M</span>
                  <div className="w-full relative" style={{ height: '140px' }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-gray-200 to-gray-100'}`}
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-medium ${isToday ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>{item.jour}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-600">Total semaine</span>
            <span className="text-lg font-bold text-gray-900">
              {(evolutionSemaine.reduce((s, e) => s + e.montant, 0) / 1000000).toFixed(1)}M FCFA
            </span>
          </div>
        </div>

        {/* Répartition par module */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Répartition</h3>
          <p className="text-sm text-gray-600 mb-5">Par source de recettes</p>
          <div className="space-y-4">
            {modulesRecettes.map((m, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded ${m.barColor} flex items-center justify-center`}>
                      <i className={`${m.icon} text-white text-xs`}></i>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{m.nom}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">{m.pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${m.barColor} transition-all duration-500`} style={{ width: `${Math.min(m.pct, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{m.montant.toLocaleString()} FCFA</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agents + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top agents */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Performance des agents</h3>
              <p className="text-sm text-gray-600 mt-1">Top 5 du jour</p>
            </div>
            <Link to="/utilisateurs" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer whitespace-nowrap">
              Voir tous
            </Link>
          </div>
          <div>
            <div className="overflow-x-auto"><table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Collecté</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Progression</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayAgentsTop.map((agent, idx) => {
                  const objectif = Math.max(agent.collecte * 1.2, 500000);
                  const pct = Math.round((agent.collecte / objectif) * 100);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                            {agent.initiale || `${agent.nom?.[0] || ''}${agent.prenom?.[0] || ''}`}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{agent.nom}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{agent.collecte.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 ml-1">FCFA</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-semibold ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{agent.transactions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>
        </div>

        {/* Alertes */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes & Notifications</h3>
          <div className="space-y-3">
            {alertes.map((a, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${
                  a.type === 'danger' ? 'bg-red-50 border-red-200' :
                  a.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                  'bg-sky-50 border-sky-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <i className={`${a.icon} text-lg mt-0.5 ${
                    a.type === 'danger' ? 'text-red-600' :
                    a.type === 'warning' ? 'text-amber-600' :
                    'text-sky-600'
                  }`}></i>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800">{a.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{a.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transactions récentes</h3>
            <p className="text-sm text-gray-600 mt-1">Dernières opérations de la journée</p>
          </div>
          <Link to="/recettes" className="px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap">
            Voir tout
          </Link>
        </div>
        <div>
          <div className="overflow-x-auto"><table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">N° Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Contribuable</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Heure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactionsRecentes.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">{t.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.contribuable}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.agent}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{t.montant.toLocaleString()} FCFA</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.heure}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      <i className="ri-check-line mr-1"></i>Complété
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}
