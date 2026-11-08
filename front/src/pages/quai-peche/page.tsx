import { useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { downloadCsv, today } from '../../utils/csv';

// Types
type Commission = {
  id: string;
  numero: string;
  pecheur: string;
  poids: number;
  typePoisson: string;
  date: string;
  heure: string;
  temperatura: number;
  statut: string;
};

// Données des commissions
const commissionsData: Commission[] = [
  { id: '1', numero: 'CF-2026-001', pecheur: 'Moussa Sall', poids: 150, typePoisson: 'Maquereau', date: '17/03/2026', heure: '08:30', temperatura: -5, statut: 'Enregistrée' },
  { id: '2', numero: 'CF-2026-002', pecheur: 'Aliou Diop', poids: 200, typePoisson: 'Sardine', date: '17/03/2026', heure: '09:15', temperatura: -4, statut: 'Enregistrée' },
  { id: '3', numero: 'CF-2026-003', pecheur: 'Mamadou Touré', poids: 120, typePoisson: 'Thon', date: '17/03/2026', heure: '10:00', temperatura: -6, statut: 'Validée' },
  { id: '4', numero: 'CF-2026-004', pecheur: 'Moussa Sall', poids: 80, typePoisson: 'Maquereau', date: '16/03/2026', heure: '14:20', temperatura: -5, statut: 'Validée' },
  { id: '5', numero: 'CF-2026-005', pecheur: 'Aliou Diop', poids: 180, typePoisson: 'Sardine', date: '16/03/2026', heure: '15:45', temperatura: -4, statut: 'Validée' },
];

// Pêcheurs actifs
const pecheursActifs = [
  { id: '1', nom: 'Sall', prenom: 'Moussa' },
  { id: '2', nom: 'Diop', prenom: 'Aliou' },
  { id: '3', nom: 'Touré', prenom: 'Mamadou' },
];

export default function QuaiPechePage() {
  const [commissions, setCommissions] = useState<Commission[]>(commissionsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  
  // Statistiques
  const totalCommissions = commissions.length;
  const totalPoids = commissions.reduce((sum, c) => sum + c.poids, 0);
  const commissionsEnAttente = commissions.filter(c => c.statut === 'Enregistrée').length;
  const pecheursActifsCount = pecheursActifs.length;

  // Filtrage des commissions
  const filteredCommissions = commissions.filter(c => {
    const matchSearch = c.numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.pecheur.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.typePoisson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = statutFilter === 'all' || c.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  // Valider une commission
  const handleValidate = (id: string) => {
    setCommissions(commissions.map(c => 
      c.id === id ? { ...c, statut: 'Validée' } : c
    ));
  };

  // Voir les détails
  const handleView = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowViewModal(true);
  };

  // Exporter en CSV
  const handleExport = () => {
    const data = [
      ['Numéro', 'Pêcheur', 'Poids (kg)', 'Type', 'Date', 'Heure', 'Température', 'Statut'],
      ...commissions.map(c => [c.numero, c.pecheur, String(c.poids), c.typePoisson, c.date, c.heure, String(c.temperatura), c.statut])
    ];
    downloadCsv(`commissions_frigorifiques_${today()}.csv`, data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quai de Pêche</h1>
            <p className="text-sm text-gray-600 mt-1">Gestion du quai de pêche et des commissions frigorifiques</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commissions</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalCommissions}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="ri-snowy-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Poids Total (kg)</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalPoids.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <i className="ri-scales-line text-xl text-emerald-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Attente</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{commissionsEnAttente}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <i className="ri-time-line text-xl text-amber-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pêcheurs Actifs</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{pecheursActifsCount}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <i className="ri-group-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="Enregistrée">Enregistrée</option>
                <option value="Validée">Validée</option>
              </select>
              <button
                onClick={handleExport}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <i className="ri-download-line"></i>
                Exporter
              </button>
            </div>
          </div>
        </div>

        {/* Tableau des Commissions Frigorifiques */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">N° Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pêcheur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Poids (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type Poisson</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Température</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCommissions.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.numero}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.pecheur}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.poids}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.typePoisson}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.temperatura}°C</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.statut === 'Validée' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.statut === 'Enregistrée' && (
                          <button
                            onClick={() => handleValidate(item.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Valider"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                        <button
                          onClick={() => handleView(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Voir"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Voir Détails */}
      {showViewModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Détails de la Commission</h3>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Numéro</p>
                  <p className="font-medium">{selectedCommission.numero}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{selectedCommission.date}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pêcheur</p>
                <p className="font-medium">{selectedCommission.pecheur}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Poids</p>
                  <p className="font-medium">{selectedCommission.poids} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type de Poisson</p>
                  <p className="font-medium">{selectedCommission.typePoisson}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Température</p>
                  <p className="font-medium">{selectedCommission.temperatura}°C</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedCommission.statut === 'Validée' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {selectedCommission.statut}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
