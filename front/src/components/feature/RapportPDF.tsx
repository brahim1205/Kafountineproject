import React from 'react';
interface ModuleStat {
  name: string;
  amount: number;
  icon: string;
  couleur: string;
  stats: {
    evolution?: number;
  };
}

interface JournalEntry {
  date: string | Date;
  type: string;
  person?: string;
  acteur?: string;
  amount: number;
  description: string;
  formattedDate?: string;
}

interface ContribuableTop {
  name: string;
  amount: number;
}

interface RapportPDFProps {
  year: number;
  total: number;
  totalExpenses: number;
  tauxRecouvrement: number;
  totalTransactions: number;
  totalContribuables: number;
  moduleStats: ModuleStat[];
  topContribuables: ContribuableTop[];
  journal: JournalEntry[];
  onClose: () => void;
}

export default function RapportPDF({
  year,
  total,
  totalExpenses,
  tauxRecouvrement,
  totalTransactions,
  totalContribuables,
  moduleStats,
  topContribuables,
  journal,
  onClose
}: RapportPDFProps) {

  return (
    <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 no-print backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md p-4 border-b border-gray-100 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <i className="ri-file-list-3-line text-emerald-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Prévisualisation du Rapport Annuel</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Exercice {year}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              Fermer
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <i className="ri-printer-line"></i>
              IMPRIMER LE RAPPORT
            </button>
          </div>
        </div>

        <div id="rapport-content" className="p-12 bg-white relative min-h-screen">
          {/* Filigrane */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none rotate-[-35deg] overflow-hidden">
            <p className="text-[10rem] font-black text-gray-900">COMMUNE DE KAFOUNTINE</p>
          </div>

          {/* En-tête Officiel */}
          <div className="relative text-center border-b-4 border-double border-emerald-600/20 pb-8 mb-12">
            <div className="flex justify-between items-start mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              <div className="text-left leading-relaxed">
                <p>République du Sénégal</p>
                <p className="text-gray-300 font-medium tracking-widest">Un Peuple - Un But - Une Foi</p>
              </div>
              <div className="text-right leading-relaxed">
                <p>Région de Ziguinchor</p>
                <p className="text-gray-300 font-medium tracking-widest">Département de Bignona</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-emerald-50 shadow-xl">
                <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain p-2" />
              </div>
              <div className="mt-2">
                <h1 className="text-4xl font-black text-emerald-800 tracking-tighter uppercase mb-1">
                  Commune de Kafountine
                </h1>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-[2px] w-12 bg-emerald-500"></div>
                  <span className="text-sm font-black text-emerald-600 uppercase tracking-[0.5em]">Hôtel de Ville</span>
                  <div className="h-[2px] w-12 bg-emerald-500"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Titre du Rapport */}
          <div className="text-center mb-16">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest border-y-2 border-gray-100 py-4 inline-block px-12">
              Rapport Annuel de Gestion - {year}
            </h2>
            <p className="mt-4 text-gray-500 font-bold italic">Rapport consolidé des activités financières et administratives</p>
          </div>

          {/* Synthèse Chiffrée */}
          <div className="mb-16">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                <i className="ri-dashboard-3-line"></i>
              </span>
              SYNTHESE GENERALE
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-lg">
                <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Total Recettes</p>
                <h4 className="text-xl font-black text-emerald-400">{total.toLocaleString('fr-FR')} <span className="text-[10px]">FCFA</span></h4>
              </div>
              <div className="bg-white border-2 border-red-50 p-6 rounded-3xl shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-gray-400">Total Dépenses</p>
                <h4 className="text-xl font-black text-red-600">{totalExpenses.toLocaleString('fr-FR')} <span className="text-[10px]">FCFA</span></h4>
              </div>
              <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg">
                <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Solde Net</p>
                <h4 className="text-xl font-black">{(total - totalExpenses).toLocaleString('fr-FR')} <span className="text-[10px]">FCFA</span></h4>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-gray-400">Recouvrement</p>
                <h4 className="text-xl font-black text-gray-900">{tauxRecouvrement}%</h4>
              </div>
              <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-gray-400">Transactions</p>
                <h4 className="text-xl font-black text-gray-900">{totalTransactions}</h4>
              </div>
              <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-gray-400">Contribuables</p>
                <h4 className="text-xl font-black text-gray-900">{totalContribuables}</h4>
              </div>
            </div>
          </div>

          {/* Répartition par Module */}
          <div className="mb-16">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <i className="ri-pie-chart-line"></i>
              </span>
              REPARTITION PAR MODULE
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {moduleStats.map((m) => {
                const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0;
                return (
                  <div key={m.name} className="flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className={`w-12 h-12 rounded-xl ${m.couleur} flex items-center justify-center text-white shadow-md`}>
                      <i className={`${m.icon} text-xl`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-black text-gray-700 uppercase text-xs tracking-wider">{m.name}</span>
                        <span className="font-black text-gray-900">{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${m.couleur}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                    <div className="text-right min-w-[150px]">
                      <p className="text-sm font-black text-gray-900">{m.amount.toLocaleString()} FCFA</p>
                      <p className="text-[10px] font-bold text-green-600">+{m.stats.evolution || 0}% de croissance</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Analyse des Dépenses */}
          <div className="mb-16 avoid-break">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                <i className="ri-arrow-left-down-line"></i>
              </span>
              ANALYSE DES DEPENSES
            </h3>
            <div className="bg-red-50/50 rounded-3xl p-8 border border-red-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-1">Total des Sorties de Caisse</p>
                  <h4 className="text-3xl font-black text-red-600">{totalExpenses.toLocaleString()} FCFA</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ratio Dépenses / Recettes</p>
                  <h4 className="text-2xl font-black text-gray-900">{total > 0 ? Math.round((totalExpenses / total) * 100) : 0}%</h4>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {journal.filter(item => item.amount < 0).slice(0, 4).map((d, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-red-50 flex justify-between items-center gap-4 min-h-[70px]">
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter mb-1">{d.type}</span>
                      <span className="text-xs font-bold text-gray-700 leading-tight">{d.description}</span>
                    </div>
                    <span className="font-black text-red-600 text-sm whitespace-nowrap">{Math.abs(d.amount).toLocaleString()} F</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="page-break"></div>

          {/* Journal Détaillé Groupé par Mois */}
          <div className="mt-12 page-break-before">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                <i className="ri-history-line"></i>
              </span>
              Journal Chronologique des Opérations
            </h3>
            
            {Object.entries(
              journal.reduce((acc: Record<string, JournalEntry[]>, item: JournalEntry) => {
                const dateObj = new Date(item.date);
                const month = (dateObj.getMonth() + 1).toString().padStart(2, '0') + '/' + dateObj.getFullYear();
                if (!acc[month]) acc[month] = [];
                acc[month].push({
                  ...item,
                  formattedDate: dateObj.toLocaleDateString('fr-FR')
                });
                return acc;
              }, {})
            ).map(([monthKey, items]: [string, JournalEntry[]]) => (
              <div key={monthKey} className="mb-12 avoid-break">
                <div className="bg-gray-100 px-6 py-2 rounded-xl mb-4">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">
                    Période : {monthKey}
                  </h4>
                </div>
                <div className="overflow-hidden border border-gray-100 rounded-3xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800 text-white text-[9px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Opération</th>
                        <th className="px-6 py-3">Acteur / Contribuable</th>
                        <th className="px-6 py-3 text-right">Montant</th>
                        <th className="px-6 py-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold divide-y divide-gray-100">
                      {items.map((item: JournalEntry, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                          <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{item.formattedDate}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-black ${
                              item.type?.includes('Recette') ? 'bg-green-100 text-green-700' : 
                              item.type?.includes('Depense') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-900">{item.person || item.acteur}</td>
                          <td className={`px-6 py-3 text-right font-black ${
                            String(item.amount).startsWith('-') || item.amount < 0 ? 'text-red-600' : 
                            item.amount > 0 ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {item.amount > 0 ? '+' : ''}{Number(item.amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-gray-500 truncate max-w-[200px]">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Top Contribuables */}
          {topContribuables && topContribuables.length > 0 && (
            <div className="mt-16 avoid-break">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <i className="ri-medal-line"></i>
                </span>
                TOP CONTRIBUABLES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topContribuables.slice(0, 3).map((c, i) => (
                  <div key={i} className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm font-black text-indigo-600 border border-indigo-50">
                      #{i + 1}
                    </div>
                    <p className="font-black text-gray-900 truncate uppercase text-sm mb-1">{c.name}</p>
                    <p className="text-indigo-600 font-black">{c.amount?.toLocaleString()} FCFA</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer du Rapport */}
          <div className="mt-24 pt-12 border-t border-gray-100 flex flex-col items-center avoid-break">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.5em] mb-4 text-center">Authenticité Garantie - Commune de Kafountine</p>
            <div className="flex gap-8 text-[9px] text-gray-400 font-bold uppercase tracking-widest border-t border-gray-50 pt-4 w-full justify-center">
              <p>Mairie de Kafountine</p>
              <p>Contact: +221 33 994 00 00</p>
              <p>www.kafountine.sn</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 1cm;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          #rapport-content {
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          .page-break-before {
            page-break-before: always;
            margin-top: 2cm;
          }
          .avoid-break {
            page-break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          thead {
            display: table-header-group;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
