import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { getReportsOverview, getReportTransactions, type ReportsOverview } from '../../services/reports';
import type { TransactionItem } from '../../services/taxes';
import { useYear } from '../../contexts/YearContext';
import { useToast } from '../../components/feature/Toast';

export default function Rapports() {
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
        if (mounted) {
          showToast('Erreur lors du chargement des donnees des rapports.', 'error');
          setOverview(null);
          setTransactions([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedYear, showToast]);

  const moduleStats = useMemo(() => {
    const taxes = Number(overview?.txStats?.annee?.total || overview?.txStats?.mois?.total || 0);
    const motos = Number(overview?.motosStats?.recettesAnnee || overview?.motosStats?.recettesMois || 0);
    const marche = Number(overview?.marcheStats?.recettesMois || 0);
    const etatCivil = Number(overview?.etatCivilStats?.recettes || 0);
    const urbanisme = Number(overview?.urbanismeStats?.recettes || 0);
    const formations = Number(overview?.formationsStats?.budgetTotal || 0);

    const tauxRecouvrement = (overview?.txStats?.annee?.transactions || 0) > 0 ? Math.round(((overview?.txStats?.annee?.transactions || 0) / (overview?.totalContribuables || 1)) * 100) : 0;

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
        }
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
        }
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
        }
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
        }
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
        }
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
        }
      },
    ];
  }, [overview]);

  const evolutionMensuelle = useMemo(() => {
    return overview?.evolutionSemaine || [];
  }, [overview?.evolutionSemaine]);

  const total = moduleStats.reduce((sum, m) => sum + m.amount, 0);
  const maxMontant = Math.max(...evolutionMensuelle.map(e => e.montant), 1);

  const topContribuables = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((tx) => {
      const name = `${tx.contribuable?.prenom || ''} ${tx.contribuable?.nom || ''}`.trim() || '-';
      map.set(name, (map.get(name) || 0) + Number(tx.montant || 0));
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions]);

  const exportCsv = () => {
    const rows = [
      ['Module', 'Montant (FCFA)', 'Evolution (%)'],
      ...moduleStats.map((m) => [m.name, String(m.amount), String((m.stats as { evolution?: number }).evolution || 0)]),
      ['TOTAL', String(total), ''],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-annuel-${selectedYear}.csv`;
    link.click();
    showToast('Rapport exporte en CSV', 'success');
  };

  const exportPdf = () => {
    window.print();
    showToast('Utilisez "Enregistrer en PDF" dans la boite de dialogue d\'impression.', 'info');
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-sm">Total annuel</p>
                    <p className="text-3xl font-bold mt-1">{(total / 1000000).toFixed(1)}M</p>
                    <p className="text-teal-100 text-xs mt-1">FCFA</p>
                  </div>
                  <i className="ri-money-dollar-circle-line text-4xl text-teal-200"></i>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Evolution</p>
                    <p className="text-3xl font-bold mt-1">{Math.round(overview?.tauxRecouvrement || 0)}%</p>
                    <p className="text-purple-100 text-xs mt-1">taux de recouvrement</p>
                  </div>
                  <i className="ri-trending-up-line text-4xl text-purple-200"></i>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Transactions</p>
                    <p className="text-3xl font-bold mt-1">{overview?.txStats?.annee?.transactions?.toLocaleString('fr-FR') || 0}</p>
                    <p className="text-blue-100 text-xs mt-1">tickets emis</p>
                  </div>
                  <i className="ri-file-list-3-line text-4xl text-blue-200"></i>
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm">Contribuables</p>
                    <p className="text-3xl font-bold mt-1">{overview?.totalContribuables?.toLocaleString('fr-FR') || 0}</p>
                    <p className="text-amber-100 text-xs mt-1">inscrits</p>
                  </div>
                  <i className="ri-user-line text-4xl text-amber-200"></i>
                </div>
              </div>
            </div>

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

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Contribuables</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Rang</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Contribuable</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Montant total</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">% du total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topContribuables.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          Aucune donnee disponible
                        </td>
                      </tr>
                    )}
                    {topContribuables.map((c, i) => (
                      <tr key={`${c.name}-${i}`} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            i === 0 ? 'bg-yellow-100 text-yellow-800' :
                            i === 1 ? 'bg-gray-100 text-gray-800' :
                            i === 2 ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            #\{i + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{c.name}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right">{c.amount.toLocaleString('fr-FR')} FCA</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">{total > 0 ? ((c.amount / total) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
