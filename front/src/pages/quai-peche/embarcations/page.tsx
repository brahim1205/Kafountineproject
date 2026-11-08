import { useState, useEffect } from "react";
import { useYear } from "../../../contexts/YearContext";
import DashboardLayout from '../../../components/feature/DashboardLayout';
import { listEmbarcations, listPecheurs, createEmbarcation, updateEmbarcation, deleteEmbarcation, type Embarcation, type Pecheur } from '../../../services/quai-peche';
import {
  clearFieldValidationError,
  validateFormElement,
} from '../../../utils/formValidation';
import { downloadCsv, today } from '../../../utils/csv';

export default function EmbarcationsPage() {
  const [embarcations, setEmbarcations] = useState<Embarcation[]>([]);
  const [pecheurs, setPecheurs] = useState<Pecheur[]>([]);
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmbarcation, setSelectedEmbarcation] = useState<Embarcation | null>(null);
  
  // Form
  const [formData, setFormData] = useState({
    nom: '',
    immatriculation: '',
    type: 'Pirogue',
    taille: '',
    moteur: '',
    pecheurId: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [embarcationsData, pecheursData] = await Promise.all([
        listEmbarcations({ year: selectedYear, limit: 100 }),
        listPecheurs({ year: selectedYear, limit: 100 })
      ]);
      setEmbarcations(embarcationsData);
      setPecheurs(pecheursData);
    } catch {
      setEmbarcations([]);
      setPecheurs([]);
      setErrorMsg("Impossible de charger les embarcations.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmbarcations = embarcations.filter(e => {
    const matchSearch = e.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        e.immatriculation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = statutFilter === 'all' || e.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const actifs = filteredEmbarcations.filter(e => e.statut === 'ACTIF').length;

  const handleView = (embarcation: Embarcation) => {
    setSelectedEmbarcation(embarcation);
    setShowViewModal(true);
  };

  const handleEdit = (embarcation: Embarcation) => {
    setSelectedEmbarcation(embarcation);
    setFormData({
      nom: embarcation.nom,
      immatriculation: embarcation.immatriculation,
      type: embarcation.type,
      taille: String(embarcation.taille || ''),
      moteur: embarcation.moteur || '',
      pecheurId: embarcation.pecheurId || ''
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }
    try {
      setErrorMsg('');
      await createEmbarcation({
        ...formData,
        taille: formData.taille ? parseFloat(formData.taille) : undefined
      });
      setShowModal(false);
      setFormData({ nom: '', immatriculation: '', type: 'Pirogue', taille: '', moteur: '', pecheurId: '' });
      loadData();
    } catch {
      setErrorMsg("Impossible de créer l'embarcation.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmbarcation) return;
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }
    try {
      setErrorMsg('');
      await updateEmbarcation(selectedEmbarcation.id, {
        ...formData,
        taille: formData.taille ? parseFloat(formData.taille) : undefined
      });
      setShowEditModal(false);
      loadData();
    } catch {
      setErrorMsg("Impossible de mettre à jour l'embarcation.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette embarcation?')) return;
    try {
      setErrorMsg('');
      await deleteEmbarcation(id);
      loadData();
    } catch {
      setErrorMsg("Impossible de supprimer l'embarcation.");
    }
  };

  const handleExport = () => {
    const data = [
      ['Nom', 'Immatriculation', 'Type', 'Taille (m)', 'Moteur', 'Propriétaire', 'Statut'],
      ...filteredEmbarcations.map(e => [
        e.nom, e.immatriculation, e.type, e.taille ? String(e.taille) : '-', e.moteur || '-', `${e.pecheur?.prenom || ''} ${e.pecheur?.nom || ''}`, e.statut
      ])
    ];
    downloadCsv(`embarcations_${today()}.csv`, data);
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
            <h1 className="text-2xl font-bold text-gray-900">Embarcations</h1>
            <p className="text-sm text-gray-600 mt-1">Gestion des embarcations du quai de pêche</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Embarcations</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{filteredEmbarcations.length}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="ri-ship-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Embarcations Actives</p>
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
                <p className="text-sm text-gray-600">En Maintenance</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{filteredEmbarcations.filter(e => e.statut === 'EN_MAINTENANCE').length}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <i className="ri-tools-line text-xl text-amber-600"></i>
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
                <option value="ACTIF">Actif</option>
                <option value="EN_MAINTENANCE">En maintenance</option>
                <option value="INACTIF">Inactif</option>
              </select>
              {isCurrentYear && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <i className="ri-add-line"></i>
                  Nouveau
                </button>
              )}
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

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Immatriculation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Taille</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Propriétaire</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Chargement...</td>
                  </tr>
                ) : filteredEmbarcations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Aucune embarcation trouvée</td>
                  </tr>
                ) : (
                  filteredEmbarcations.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.nom}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-mono">{item.immatriculation}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.taille ? `${item.taille} m` : '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.pecheur ? `${item.pecheur.prenom} ${item.pecheur.nom}` : '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.statut === 'ACTIF' ? 'bg-green-50 text-green-700' : 
                          item.statut === 'EN_MAINTENANCE' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Voir"
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                          {isCurrentYear && (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Modifier"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Supprimer"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </>
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

      {/* Modal Nouvelle Embarcation */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Embarcation</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      data-required="true"
                      type="text"
                      placeholder="Ex: Bateau A"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation *</label>
                    <input
                      data-required="true"
                      type="text"
                      placeholder="Ex: KP-001"
                      value={formData.immatriculation}
                      onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      data-required="true"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Pirogue">Pirogue</option>
                      <option value="Canot">Canot</option>
                      <option value="Chalutier">Chalutier</option>
                      <option value="Senneur">Senneur</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taille (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Ex: 12"
                      value={formData.taille}
                      onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moteur</label>
                    <input
                      type="text"
                      placeholder="Ex: Yamaha 40 CV"
                      value={formData.moteur}
                      onChange={(e) => setFormData({ ...formData, moteur: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
                    <select
                      value={formData.pecheurId}
                      onChange={(e) => setFormData({ ...formData, pecheurId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Sélectionner un pêcheur</option>
                      {pecheurs.map(p => (
                        <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifier Embarcation */}
      {showEditModal && selectedEmbarcation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Modifier l'Embarcation</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdate} onInput={clearFieldValidationError} noValidate>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      data-required="true"
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation *</label>
                    <input
                      data-required="true"
                      type="text"
                      value={formData.immatriculation}
                      onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      data-required="true"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Pirogue">Pirogue</option>
                      <option value="Canot">Canot</option>
                      <option value="Chalutier">Chalutier</option>
                      <option value="Senneur">Senneur</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taille (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.taille}
                      onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moteur</label>
                    <input
                      type="text"
                      value={formData.moteur}
                      onChange={(e) => setFormData({ ...formData, moteur: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
                    <select
                      value={formData.pecheurId}
                      onChange={(e) => setFormData({ ...formData, pecheurId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Sélectionner un pêcheur</option>
                      {pecheurs.map(p => (
                        <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Voir Détails */}
      {showViewModal && selectedEmbarcation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Détails de l'Embarcation</h3>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Nom:</span><span className="font-medium">{selectedEmbarcation.nom}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Immatriculation:</span><span className="font-medium font-mono">{selectedEmbarcation.immatriculation}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type:</span><span className="font-medium">{selectedEmbarcation.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Taille:</span><span className="font-medium">{selectedEmbarcation.taille ? `${selectedEmbarcation.taille} m` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Moteur:</span><span className="font-medium">{selectedEmbarcation.moteur || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Propriétaire:</span><span className="font-medium">{selectedEmbarcation.pecheur ? `${selectedEmbarcation.pecheur.prenom} ${selectedEmbarcation.pecheur.nom}` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Statut:</span><span className="font-medium">{selectedEmbarcation.statut}</span></div>
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
