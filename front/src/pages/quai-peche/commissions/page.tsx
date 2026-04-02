import { useState, useEffect } from 'react';
import { useYear } from '../../../contexts/YearContext';
import DashboardLayout from '../../../components/feature/DashboardLayout';
import { listCommissions, validateCommission, createCommission, type Commission, type Pecheur } from '../../../services/quai-peche';
import { listPecheurs } from '../../../services/quai-peche';

export default function CommissionsPage() {
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [pecheurs, setPecheurs] = useState<Pecheur[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  
  // Form
  const [formData, setFormData] = useState({
    pecheurId: '',
    poids: '',
    typePoisson: 'Maquereau',
    temperatura: '',
    observations: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [commissionsData, pecheursData] = await Promise.all([
        listCommissions({ limit: 100 }),
        listPecheurs({ limit: 100 })
      ]);
      setCommissions(commissionsData);
      setPecheurs(pecheursData);
    } catch {
      setCommissions([]);
      setPecheurs([]);
      setErrorMsg("Impossible de charger les commissions.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCommissions = commissions.filter(c => {
    const matchSearch = c.numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.pecheur?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.pecheur?.prenom?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = statutFilter === 'all' || c.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const totalPoids = filteredCommissions.reduce((sum, c) => sum + c.poids, 0);
  const enAttente = filteredCommissions.filter(c => c.statut === 'ENREGISTREE').length;

  const handleValidate = async (id: string) => {
    try {
      setErrorMsg('');
      await validateCommission(id);
      setCommissions(commissions.map(c => 
        c.id === id ? { ...c, statut: 'VALIDEE' } : c
      ));
    } catch {
      setErrorMsg("Impossible de valider la commission.");
    }
  };

  const handleView = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowViewModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      await createCommission({
        pecheurId: formData.pecheurId,
        poids: parseFloat(formData.poids),
        typePoisson: formData.typePoisson,
        temperatura: formData.temperatura ? parseFloat(formData.temperatura) : undefined,
        observations: formData.observations || undefined
      });
      setShowModal(false);
      setFormData({ pecheurId: '', poids: '', typePoisson: 'Maquereau', temperatura: '', observations: '' });
      loadData();
    } catch {
      setErrorMsg("Impossible de créer la commission.");
    }
  };

  const handleExport = () => {
    const data = [
      ['Numéro', 'Pêcheur', 'Poids (kg)', 'Type', 'Température', 'Date', 'Statut'],
      ...filteredCommissions.map(c => [
        c.numero, 
        `${c.pecheur?.prenom || ''} ${c.pecheur?.nom || ''}`, 
        String(c.poids), 
        c.typePoisson, 
        c.temperatura ? `${c.temperatura}°C` : '-',
        new Date(c.date).toLocaleDateString('fr-FR'),
        c.statut
      ])
    ];
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commissions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Commissions Frigorifiques</h1>
            <p className="text-sm text-gray-600 mt-1">Gestion des commissions du quai de pêche</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commissions</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{filteredCommissions.length}</h3>
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
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <i className="ri-scales-line text-xl text-teal-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Attente</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{enAttente}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <i className="ri-time-line text-xl text-amber-600"></i>
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
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="ENREGISTREE">Enregistrée</option>
                <option value="VALIDEE">Validée</option>
                <option value="REJETEE">Rejetée</option>
              </select>
              {
isCurrentYear && (
                <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <i className="ri-add-line"></i>
                Nouveau
              </button>
              )}
              {
isCurrentYear && (
                <button
                onClick={handleExport}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <i className="ri-download-line"></i>
                Exporter
              </button>
              )}
            </div>
          </div>
        </div>

        {/* Tableau */}
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
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Chargement...</td>
                  </tr>
                ) : filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Aucune commission trouvée</td>
                  </tr>
                ) : (
                  filteredCommissions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.numero}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.pecheur?.prenom} {item.pecheur?.nom}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.poids}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.typePoisson}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.temperatura ? `${item.temperatura}°C` : '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.statut === 'VALIDEE' ? 'bg-green-50 text-green-700' : 
                          item.statut === 'ENREGISTREE' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.statut === 'ENREGISTREE' && isCurrentYear && (
                            <button
                              onClick={() => handleValidate(item.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Valider"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                          )}
                          {isCurrentYear && (
                            <button
                              onClick={() => handleView(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Voir"
                            >
                            <i className="ri-eye-line"></i>
                          </button>
              )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nouvelle Commission */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Commission Frigorifique</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pêcheur *</label>
                  <select
                    required
                    value={formData.pecheurId}
                    onChange={(e) => setFormData({ ...formData, pecheurId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Sélectionner un pêcheur</option>
                    {pecheurs.map(p => (
                      <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Ex: 150"
                      value={formData.poids}
                      onChange={(e) => setFormData({ ...formData, poids: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de Poisson *</label>
                    <select
                      required
                      value={formData.typePoisson}
                      onChange={(e) => setFormData({ ...formData, typePoisson: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Maquereau">Maquereau</option>
                      <option value="Sardine">Sardine</option>
                      <option value="Thon">Thon</option>
                      <option value="Dorade">Dorade</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Température (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: -5"
                      value={formData.temperatura}
                      onChange={(e) => setFormData({ ...formData, temperatura: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                  <textarea
                    rows={3}
                    placeholder="Observations..."
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Voir Détails */}
      {showViewModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Détails de la Commission</h3>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Numéro:</span><span className="font-medium">{selectedCommission.numero}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pêcheur:</span><span className="font-medium">{selectedCommission.pecheur?.prenom} {selectedCommission.pecheur?.nom}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Poids:</span><span className="font-medium">{selectedCommission.poids} kg</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type:</span><span className="font-medium">{selectedCommission.typePoisson}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Température:</span><span className="font-medium">{selectedCommission.temperatura ? `${selectedCommission.temperatura}°C` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="font-medium">{new Date(selectedCommission.date).toLocaleDateString('fr-FR')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Statut:</span><span className="font-medium">{selectedCommission.statut}</span></div>
              {selectedCommission.observations && <div className="flex justify-between"><span className="text-gray-500">Observations:</span><span className="font-medium">{selectedCommission.observations}</span></div>}
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
