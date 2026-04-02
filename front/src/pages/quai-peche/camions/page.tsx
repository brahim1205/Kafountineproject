import { useState, useEffect, useMemo } from 'react';
import { useYear } from '../../../contexts/YearContext';
import DashboardLayout from '../../../components/feature/DashboardLayout';
import { listCamions, createCamion, deleteCamion, listExpeditions, createExpedition, type CamionFrigorifique, type Expedition } from '../../../services/quai-peche';

export default function CamionsPage() {
  const [camionsList, setCamionsList] = useState<CamionFrigorifique[]>([]);
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'camions' | 'expeditions'>('camions');
  
  // Modals
  const [showCamionModal, setShowCamionModal] = useState(false);
  const [showExpeditionModal, setShowExpeditionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCamion, setSelectedCamion] = useState<CamionFrigorifique | null>(null);
  const [selectedExpedition, setSelectedExpedition] = useState<Expedition | null>(null);
  
  // Form
  const [camionForm, setCamionForm] = useState({
    immatriculation: '',
    marque: '',
    modele: '',
    capacite: '',
    chauffeur: '',
    telephone: ''
  });
  
  const [expeditionForm, setExpeditionForm] = useState({
    camionId: '',
    poids: '',
    destination: '',
    montant: '',
    observations: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [camionsData, expeditionsData] = await Promise.all([
        listCamions({ limit: 100 }),
        listExpeditions({ limit: 100 })
      ]);
      setCamionsList(camionsData);
      setExpeditions(expeditionsData);
    } catch {
      setCamionsList([]);
      setExpeditions([]);
      setErrorMsg("Impossible de charger les camions et expéditions.");
    } finally {
      setLoading(false);
    }
  };

  // Use useMemo for filtered data
  const filteredCamions = useMemo(() => {
    return camionsList.filter(c => {
      const matchSearch = c.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.marque.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.chauffeur && c.chauffeur.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatut = statutFilter === 'all' || c.statut === statutFilter;
      return matchSearch && matchStatut;
    });
  }, [camionsList, searchTerm, statutFilter]);

  const filteredExpeditionsList = useMemo(() => {
    return expeditions.filter(e => {
      const matchSearch = e.numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (e.destination && e.destination.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatut = statutFilter === 'all' || e.statut === statutFilter;
      return matchSearch && matchStatut;
    });
  }, [expeditions, searchTerm, statutFilter]);

  const actifs = filteredCamions.filter(c => c.statut === 'ACTIF').length;
  const totalRecettes = filteredExpeditionsList.reduce((sum, e) => sum + (e.montant || 0), 0);

  const handleViewCamion = (camion: CamionFrigorifique) => {
    setSelectedCamion(camion);
    setShowViewModal(true);
  };

  const handleViewExpedition = (expedition: Expedition) => {
    setSelectedExpedition(expedition);
    setShowViewModal(true);
  };

  const handleSubmitCamion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      await createCamion({
        ...camionForm,
        capacite: camionForm.capacite ? parseFloat(camionForm.capacite) : undefined
      });
      setShowCamionModal(false);
      setCamionForm({ immatriculation: '', marque: '', modele: '', capacite: '', chauffeur: '', telephone: '' });
      loadData();
    } catch {
      setErrorMsg("Impossible de créer le camion.");
    }
  };

  const handleSubmitExpedition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      await createExpedition({
        camionId: expeditionForm.camionId,
        poids: parseFloat(expeditionForm.poids),
        destination: expeditionForm.destination || undefined,
        montant: expeditionForm.montant ? parseFloat(expeditionForm.montant) : undefined,
        observations: expeditionForm.observations || undefined
      });
      setShowExpeditionModal(false);
      setExpeditionForm({ camionId: '', poids: '', destination: '', montant: '', observations: '' });
      loadData();
    } catch {
      setErrorMsg("Impossible de créer l'expédition.");
    }
  };

  const handleDeleteCamion = async (id: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce camion?')) return;
    try {
      setErrorMsg('');
      await deleteCamion(id);
      loadData();
    } catch {
      setErrorMsg("Impossible de supprimer le camion.");
    }
  };

  const handleExportCamions = () => {
    const data = [
      ['Immatriculation', 'Marque', 'Modele', 'Capacite (kg)', 'Chauffeur', 'Telephone', 'Statut'],
      ...filteredCamions.map(c => [
        c.immatriculation, c.marque, c.modele || '-', c.capacite ? String(c.capacite) : '-', c.chauffeur || '-', c.telephone || '-', c.statut
      ])
    ];
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `camions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportExpeditions = () => {
    const data = [
      ['Numero', 'Camion', 'Poids (kg)', 'Destination', 'Montant (FCFA)', 'Date', 'Statut'],
      ...filteredExpeditionsList.map(e => [
        e.numero, e.camion?.immatriculation || '-', String(e.poids), e.destination || '-', e.montant ? String(e.montant) : '-', new Date(e.date).toLocaleDateString('fr-FR'), e.statut
      ])
    ];
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expeditions_${new Date().toISOString().split('T')[0]}.csv`;
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
        {/* En-tete */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Camions Frigorifiques</h1>
            <p className="text-sm text-gray-600 mt-1">Gestion des transports et expeditions</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Camions</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{filteredCamions.length}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="ri-truck-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Camions Actifs</p>
                <h3 className="text-2xl font-bold text-green-600 mt-1">{actifs}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <i className="ri-checkbox-circle-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expeditions</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{filteredExpeditionsList.length}</h3>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <i className="ri-send-plane-line text-xl text-teal-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recettes Transport</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalRecettes.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-xl text-emerald-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('camions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'camions'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className="ri-truck-line"></i>
              Camions
            </button>
            <button
              onClick={() => setActiveTab('expeditions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'expeditions'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className="ri-send-plane-line"></i>
              Expeditions
            </button>
          </nav>
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
                <option value="ACTIF">Actif</option>
                <option value="INACTIF">Inactif</option>
                <option value="EN_COURS">En cours</option>
                <option value="LIVREE">Livree</option>
              </select>
              {activeTab === 'camions' ? (
                <>
                  {isCurrentYear && (
                    <button
                      onClick={() => setShowCamionModal(true)}
                      className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                    >
                      <i className="ri-add-line"></i>
                      Nouveau Camion
                    </button>
                  )}
                  <button
                    onClick={handleExportCamions}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <i className="ri-download-line"></i>
                    Exporter
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowExpeditionModal(true)}
                    className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                  >
                    <i className="ri-add-line"></i>
                    Nouvelle Expedition
                  </button>
                  <button
                    onClick={handleExportExpeditions}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <i className="ri-download-line"></i>
                    Exporter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tableau Camions */}
        {activeTab === 'camions' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Immatriculation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Marque</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Modele</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Capacite</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Chauffeur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Telephone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Chargement...</td>
                    </tr>
                  ) : filteredCamions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Aucun camion trouve</td>
                    </tr>
                  ) : (
                    filteredCamions.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">{item.immatriculation}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.marque}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.modele || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.capacite ? `${item.capacite} kg` : '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.chauffeur || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.telephone || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.statut === 'ACTIF' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewCamion(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Voir"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            {isCurrentYear && (
                              <button
                                onClick={() => handleDeleteCamion(item.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Supprimer"
                              >
                                <i className="ri-delete-bin-line"></i>
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
        )}

        {/* Tableau Expeditions */}
        {activeTab === 'expeditions' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">N Expedition</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Camion</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Poids (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Montant</th>
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
                  ) : filteredExpeditionsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Aucune expedition trouvee</td>
                    </tr>
                  ) : (
                    filteredExpeditionsList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.numero}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-mono">{item.camion?.immatriculation || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.poids}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.destination || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.montant ? `${item.montant.toLocaleString()} Fcfa` : '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.statut === 'LIVREE' ? 'bg-green-50 text-green-700' : 
                            item.statut === 'EN_COURS' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {item.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewExpedition(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Voir"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nouveau Camion */}
      {showCamionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouveau Camion Frigorifique</h3>
                <button onClick={() => setShowCamionModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitCamion}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation *</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: DK 1234 A"
                      value={camionForm.immatriculation}
                      onChange={(e) => setCamionForm({ ...camionForm, immatriculation: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marque *</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Renault"
                      value={camionForm.marque}
                      onChange={(e) => setCamionForm({ ...camionForm, marque: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modele</label>
                    <input
                      type="text"
                      placeholder="Ex: Master"
                      value={camionForm.modele}
                      onChange={(e) => setCamionForm({ ...camionForm, modele: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacite (kg)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 5000"
                      value={camionForm.capacite}
                      onChange={(e) => setCamionForm({ ...camionForm, capacite: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chauffeur</label>
                    <input
                      type="text"
                      placeholder="Nom du chauffeur"
                      value={camionForm.chauffeur}
                      onChange={(e) => setCamionForm({ ...camionForm, chauffeur: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                    <input
                      type="text"
                      placeholder="Ex: 77 123 45 67"
                      value={camionForm.telephone}
                      onChange={(e) => setCamionForm({ ...camionForm, telephone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCamionModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
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

      {/* Modal Nouvelle Expedition */}
      {showExpeditionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Expedition</h3>
                <button onClick={() => setShowExpeditionModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitExpedition}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Camion *</label>
                  <select
                    required
                    value={expeditionForm.camionId}
                    onChange={(e) => setExpeditionForm({ ...expeditionForm, camionId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Selectionner un camion</option>
                    {camionsList.filter(c => c.statut === 'ACTIF').map(c => (
                      <option key={c.id} value={c.id}>{c.immatriculation} - {c.marque}</option>
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
                      placeholder="Ex: 1500"
                      value={expeditionForm.poids}
                      onChange={(e) => setExpeditionForm({ ...expeditionForm, poids: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 25000"
                      value={expeditionForm.montant}
                      onChange={(e) => setExpeditionForm({ ...expeditionForm, montant: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <input
                    type="text"
                    placeholder="Ville de destination"
                    value={expeditionForm.destination}
                    onChange={(e) => setExpeditionForm({ ...expeditionForm, destination: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                  <textarea
                    rows={3}
                    placeholder="Observations..."
                    value={expeditionForm.observations}
                    onChange={(e) => setExpeditionForm({ ...expeditionForm, observations: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowExpeditionModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
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

      {/* Modal Voir Details */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCamion ? 'Details du Camion' : 'Details de l\'Expedition'}
                </h3>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {selectedCamion && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Immatriculation:</span><span className="font-medium font-mono">{selectedCamion.immatriculation}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Marque:</span><span className="font-medium">{selectedCamion.marque}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Modele:</span><span className="font-medium">{selectedCamion.modele || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Capacite:</span><span className="font-medium">{selectedCamion.capacite ? `${selectedCamion.capacite} kg` : '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Chauffeur:</span><span className="font-medium">{selectedCamion.chauffeur || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Telephone:</span><span className="font-medium">{selectedCamion.telephone || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Statut:</span><span className="font-medium">{selectedCamion.statut}</span></div>
                </>
              )}
              {selectedExpedition && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Numero:</span><span className="font-medium">{selectedExpedition.numero}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Camion:</span><span className="font-medium font-mono">{selectedExpedition.camion?.immatriculation || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Poids:</span><span className="font-medium">{selectedExpedition.poids} kg</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Destination:</span><span className="font-medium">{selectedExpedition.destination || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Montant:</span><span className="font-medium">{selectedExpedition.montant ? `${selectedExpedition.montant.toLocaleString()} Fcfa` : '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="font-medium">{new Date(selectedExpedition.date).toLocaleDateString('fr-FR')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Statut:</span><span className="font-medium">{selectedExpedition.statut}</span></div>
                </>
              )}
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
