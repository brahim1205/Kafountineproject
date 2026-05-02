import { useState } from 'react';

interface JournalItem {
  id: string;
  date: string | Date;
  person: string;
  type: string;
  amount: number;
  description: string;
  module: string;
}

interface Props {
  journal: JournalItem[];
}

export function ReportsJournalTable({ journal }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredJournal = journal.filter(item => 
    item.person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getModuleBadge = (module: string) => {
    const configs: Record<string, { color: string, icon: string }> = {
      'recettes': { color: 'bg-teal-100 text-teal-700', icon: 'ri-money-dollar-circle-line' },
      'etat-civil': { color: 'bg-amber-100 text-amber-700', icon: 'ri-file-text-line' },
      'urbanisme': { color: 'bg-rose-100 text-rose-700', icon: 'ri-building-line' },
      'marche': { color: 'bg-cyan-100 text-cyan-700', icon: 'ri-store-2-line' },
      'motos': { color: 'bg-orange-100 text-orange-700', icon: 'ri-motorbike-line' },
      'budget': { color: 'bg-gray-100 text-gray-700', icon: 'ri-wallet-3-line' },
      'formations': { color: 'bg-emerald-100 text-emerald-700', icon: 'ri-graduation-cap-line' },
      'jeunesse': { color: 'bg-purple-100 text-purple-700', icon: 'ri-user-line' },
    };
    const config = configs[module] || { color: 'bg-gray-100 text-gray-700', icon: 'ri-question-line' };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
        <i className={config.icon}></i>
        {module}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Journal détaillé des opérations</h3>
          <p className="text-sm text-gray-500">Historique complet de l'année en cours</p>
        </div>
        
        <div className="relative">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Rechercher une opération..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-full md:w-64 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type / Module</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acteur / Bénéficiaire</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredJournal.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm italic">
                  Aucune opération trouvée pour cette période.
                </td>
              </tr>
            ) : (
              filteredJournal.map((item) => {
                const date = new Date(item.date);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-gray-900">{date.toLocaleDateString('fr-FR')}</p>
                      <p className="text-[10px] text-gray-500">{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-gray-800 leading-tight">{item.type}</span>
                        {getModuleBadge(item.module)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{item.person}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 line-clamp-1 max-w-xs" title={item.description}>
                        {item.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className={`text-sm font-black ${item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.amount >= 0 ? '+' : ''}{item.amount.toLocaleString('fr-FR')}
                        <span className="ml-1 text-[10px] font-bold">FCFA</span>
                      </p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-center text-gray-500 italic">
          Affichage des {filteredJournal.length} dernières opérations de l'année {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
