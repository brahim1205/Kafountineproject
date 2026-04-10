import DashboardLayout from '../../components/feature/DashboardLayout';
import { ReportsOverviewCards } from './ReportsOverviewCards';
import { ReportsTopContribuablesTable } from './ReportsTopContribuablesTable';
import { useReportsPage } from './useReportsPage';

export default function Rapports() {
  const { selectedYear, overview, loading, moduleStats, tauxRecouvrement, evolutionMensuelle, total, maxMontant, topContribuables, exportCsv, exportPdf } =
    useReportsPage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rapport Annuel - {selectedYear}</h1>
            <p className="text-sm text-gray-600 mt-1">Synthese complete des activites de la Commune de Kafountine</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportPdf}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-file-pdf-line"></i>
              Export PDF
            </button>
            <button
              onClick={exportCsv}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-download-line"></i>
              Export CSV
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-600">Chargement des rapports...</div>
        )}

        {!loading && (
          <>
            <ReportsOverviewCards total={total} tauxRecouvrement={tauxRecouvrement} overview={overview} />

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Evolution mensuelle des recettes</h3>
              {evolutionMensuelle.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-500">
                  Aucune évolution disponible pour {selectedYear}
                </div>
              ) : (
              <div className="flex items-end justify-between h-64 gap-2">
                {evolutionMensuelle.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-md transition-all duration-300 hover:from-teal-600 hover:to-teal-500"
                      style={{ height: `${(item.montant / maxMontant) * 100}%`, minHeight: item.montant > 0 ? '8px' : '0' }}
                      title={`${item.montant.toLocaleString('fr-FR')} FCFA`}
                    ></div>
                    <span className="text-xs text-gray-500">{item.jour}</span>
                  </div>
                ))}
              </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                <span className="text-gray-600">Total annuel</span>
                <span className="font-bold text-gray-900">
                  {evolutionMensuelle.reduce((s, e) => s + e.montant, 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Repartition par module</h3>
                <div className="space-y-4">
                  {moduleStats.map((m) => {
                    const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0;
                    return (
                      <div key={m.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 flex items-center gap-2">
                            <i className={`${m.icon}`}></i>
                            {m.name}
                          </span>
                          <span className="font-medium text-gray-900">
                            {m.amount.toLocaleString('fr-FR')} FCA ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div className={`${m.couleur} h-3 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicateurs par module</h3>
                <div className="space-y-4">
                  {moduleStats.map((m) => {
                    const stats = m.stats;
                    return (
                      <div key={m.name} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <i className={`${m.icon} ${m.couleur.replace('bg-', 'text-')}`}></i>
                          <span className="font-medium text-gray-900">{m.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {m.name === 'Taxes' && (
                            <>
                              <div><span className="text-gray-500">Transactions:</span> <span className="font-medium">{(stats as { transactions?: number }).transactions}</span></div>
                              <div><span className="text-gray-500">Moyenne:</span> <span className="font-medium">{(stats as { moyenne?: number }).moyenne?.toLocaleString() || 0} FCA</span></div>
                            </>
                          )}
                          {m.name === 'Marche' && (
                            <>
                              <div><span className="text-gray-500">Places:</span> <span className="font-medium">{(stats as { places?: number }).places}</span></div>
                              <div><span className="text-gray-500">Occupation:</span> <span className="font-medium">{(stats as { occupancy?: number }).occupancy}%</span></div>
                            </>
                          )}
                          {m.name === 'Motos' && (
                            <>
                              <div><span className="text-gray-500">Motos:</span> <span className="font-medium">{(stats as { totalMotos?: number }).totalMotos}</span></div>
                              <div><span className="text-gray-500">Taux paiement:</span> <span className="font-medium">{(stats as { tauxPaiement?: number }).tauxPaiement}%</span></div>
                            </>
                          )}
                          {m.name === 'Etat Civil' && (
                            <>
                              <div><span className="text-gray-500">Actes:</span> <span className="font-medium">{(stats as { actesDelivres?: number }).actesDelivres}</span></div>
                              <div><span className="text-gray-500">Principale:</span> <span className="font-medium">{(stats as { principalesDemandes?: string[] }).principalesDemandes?.[0]}</span></div>
                            </>
                          )}
                          {m.name === 'Urbanisme' && (
                            <>
                              <div><span className="text-gray-500">Permis:</span> <span className="font-medium">{(stats as { permisDelivres?: number }).permisDelivres}</span></div>
                              <div><span className="text-gray-500">Dossiers:</span> <span className="font-medium">{(stats as { dossiers?: number }).dossiers}</span></div>
                            </>
                          )}
                          {m.name === 'Formations' && (
                            <>
                              <div><span className="text-gray-500">Jeunes:</span> <span className="font-medium">{(stats as { jeunesFormes?: number }).jeunesFormes}</span></div>
                              <div><span className="text-gray-500">Certifications:</span> <span className="font-medium">{(stats as { certifications?: number }).certifications}</span></div>
                            </>
                          )}
                          <div><span className="text-gray-500">Evolution:</span> <span className="font-medium text-green-600">+{(stats as { evolution?: number }).evolution || 0}%</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Formations Professionnelles</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <i className="ri-book-open-line text-3xl text-emerald-600 mb-2"></i>
                  <p className="text-2xl font-bold text-gray-900">{overview?.formationsStats?.totalFormations || 0}</p>
                  <p className="text-sm text-gray-600">Formations actives</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <i className="ri-user-star-line text-3xl text-blue-600 mb-2"></i>
                  <p className="text-2xl font-bold text-gray-900">{overview?.formationsStats?.totalJeunesFormes || 0}</p>
                  <p className="text-sm text-gray-600">Jeunes formes</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <i className="ri-award-line text-3xl text-purple-600 mb-2"></i>
                  <p className="text-2xl font-bold text-gray-900">{overview?.formationsStats?.totalCertifies || 0}</p>
                  <p className="text-sm text-gray-600">Certifications</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <i className="ri-money-dollar-line text-3xl text-amber-600 mb-2"></i>
                  <p className="text-2xl font-bold text-gray-900">{(overview?.formationsStats?.budgetTotal || 0) / 1000000}M</p>
                  <p className="text-sm text-gray-600">Budget (FCFA)</p>
                </div>
              </div>
            </div>

            <ReportsTopContribuablesTable topContribuables={topContribuables} total={total} />

            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Resume executif - Annee {selectedYear}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Points positifs</h4>
                  <ul className="space-y-1 text-gray-400">
                    <li>- Croissance de 12.5% des recettes</li>
                    <li>- Taux de paiement motos: 87%</li>
                    <li>- 189 certifications formations</li>
                    <li>- Occupation marche: 92%</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Defis identifies</h4>
                  <ul className="space-y-1 text-gray-400">
                    <li>- Delais traitement urbanisme</li>
                    <li>- Recouvrement taxes</li>
                    <li>- Formation agents</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Recommandations</h4>
                  <ul className="space-y-1 text-gray-400">
                    <li>- Digitaliser les processus</li>
                    <li>- Renforcer le controle</li>
                    <li>- Augmenter les formations</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
