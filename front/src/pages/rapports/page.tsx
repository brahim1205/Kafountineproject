import DashboardLayout from '../../components/feature/DashboardLayout';
import { ReportsOverviewCards } from './ReportsOverviewCards';
import { ReportsTopContribuablesTable } from './ReportsTopContribuablesTable';
import { ReportsJournalTable } from './ReportsJournalTable';
import { useReportsPage } from './useReportsPage';
import RapportPDF from '../../components/feature/RapportPDF';
import { useState, useMemo } from 'react';

export default function Rapports() {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const { selectedYear, overview, loading, moduleStats, tauxRecouvrement, evolutionMensuelle, total, maxMontant, topContribuables, detailedJournal, executiveSummary, totalExpenses, exportCsv } =
    useReportsPage();
    
  // On utilise le journal complet pour le PDF
  const journalData = useMemo(() => detailedJournal, [detailedJournal]);

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
              onClick={() => setShowPdfPreview(true)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap no-print"
            >
              <i className="ri-printer-line"></i>
              Générer Rapport (PDF)
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
                    <span className="text-xs text-gray-500">{item.mois}</span>
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
                            {m.amount.toLocaleString('fr-FR')} FCFA ({pct}%)
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
                              <div><span className="text-gray-500">Transactions:</span> <span className="font-medium">{stats.transactions || 0}</span></div>
                              <div><span className="text-gray-500">Moyenne:</span> <span className="font-medium">{Number(stats.moyenne || 0).toLocaleString()} FCFA</span></div>
                            </>
                          )}
                          {m.name === 'Marche' && (
                            <>
                              <div><span className="text-gray-500">Places:</span> <span className="font-medium">{stats.places || 0}</span></div>
                              <div><span className="text-gray-500">Occupation:</span> <span className="font-medium">{stats.occupancy || 0}%</span></div>
                            </>
                          )}
                          {m.name === 'Motos' && (
                            <>
                              <div><span className="text-gray-500">Motos:</span> <span className="font-medium">{stats.totalMotos || 0}</span></div>
                              <div><span className="text-gray-500">Taux paiement:</span> <span className="font-medium">{stats.tauxPaiement || 0}%</span></div>
                            </>
                          )}
                          {m.name === 'Etat Civil' && (
                            <>
                              <div><span className="text-gray-500">Actes:</span> <span className="font-medium">{stats.actesDelivres || 0}</span></div>
                              <div><span className="text-gray-500">Principale:</span> <span className="font-medium">{Array.isArray(stats.principalesDemandes) ? stats.principalesDemandes[0] : ''}</span></div>
                            </>
                          )}
                          {m.name === 'Urbanisme' && (
                            <>
                              <div><span className="text-gray-500">Permis:</span> <span className="font-medium">{stats.permisDelivres || 0}</span></div>
                              <div><span className="text-gray-500">Dossiers:</span> <span className="font-medium">{stats.dossiers || 0}</span></div>
                            </>
                          )}
                          {m.name === 'Formations' && (
                            <>
                              <div><span className="text-gray-500">Jeunes:</span> <span className="font-medium">{stats.jeunesFormes || 0}</span></div>
                              <div><span className="text-gray-500">Certifications:</span> <span className="font-medium">{stats.certifications || 0}</span></div>
                            </>
                          )}
                          <div><span className="text-gray-500">Evolution:</span> <span className="font-medium text-green-600">+{stats.evolution || 0}%</span></div>
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
                  <i className="ri-money-dollar-box-line text-3xl text-amber-600 mb-2"></i>
                  <p className="text-2xl font-bold text-gray-900">{(overview?.formationsStats?.budgetTotal || 0) / 1000000}M</p>
                  <p className="text-sm text-gray-600">Budget (FCFA)</p>
                </div>
              </div>
            </div>

            <ReportsTopContribuablesTable topContribuables={topContribuables} total={total} />

            <ReportsJournalTable journal={detailedJournal} />

            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Resume executif - Annee {selectedYear}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Points positifs</h4>
                  <ul className="space-y-1 text-gray-400">
                    {executiveSummary.pointsPositifs.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Defis identifies</h4>
                  <ul className="space-y-1 text-gray-400">
                    {executiveSummary.defisIdentifies.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Recommandations</h4>
                  <ul className="space-y-1 text-gray-400">
                    {executiveSummary.recommandations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showPdfPreview && (
        <RapportPDF
          year={selectedYear}
          total={total}
          totalExpenses={totalExpenses}
          tauxRecouvrement={tauxRecouvrement}
          totalTransactions={overview?.txStats?.annee?.transactions || 0}
          totalContribuables={overview?.totalContribuables || 0}
          moduleStats={moduleStats}
          topContribuables={topContribuables}
          journal={journalData}
          onClose={() => setShowPdfPreview(false)}
        />
      )}

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          .no-print, nav, aside, header, footer, .sidebar, .top-bar {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .bg-white, .bg-gray-50, .bg-gradient-to-r, .bg-gradient-to-br {
            background: white !important;
            border-color: #eee !important;
            box-shadow: none !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .text-white {
            color: black !important;
          }
          .rounded-xl, .rounded-lg {
            border-radius: 4px !important;
          }
          /* Fix layout for print */
          .grid {
            display: block !important;
          }
          .grid > div {
            margin-bottom: 2rem !important;
            page-break-inside: avoid;
          }
          h1 { font-size: 24pt !important; margin-bottom: 20pt !important; }
          h3 { font-size: 16pt !important; margin-bottom: 10pt !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #eee !important; padding: 8pt !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
