import { useState, useEffect } from "react";
import { useYear } from "../../../contexts/YearContext";
import Pagination from '../../../components/feature/Pagination';
import { fetchAllPages, useServerList } from '../../../hooks/useServerList';
import EmbarcationFormModal from './components/EmbarcationFormModal';
import EmbarcationDetailModal from './components/EmbarcationDetailModal';
import DashboardLayout from '../../../components/feature/DashboardLayout';
import { listPecheurs, createEmbarcation, updateEmbarcation, deleteEmbarcation, type Embarcation, type Pecheur, pageEmbarcations } from '../../../services/quai-peche';
import {
  validateFormElement,
} from '../../../utils/formValidation';
import { downloadCsv, today } from '../../../utils/csv';

export default function EmbarcationsPage() {
  const [pecheurs, setPecheurs] = useState<Pecheur[]>([]);
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const [actionError, setErrorMsg] = useState('');
  const list = useServerList<Embarcation>((query) => pageEmbarcations({ year: selectedYear, ...query }), [selectedYear]);
  const { items: embarcations, loading, reload: loadData, yearTotal, counts } = list;
  const errorMsg = actionError || list.error;
  const searchTerm = list.search;
  const setSearchTerm = list.setSearch;
  const statutFilter = list.statut;
  const setStatutFilter = list.setStatut;
  
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


  const filteredEmbarcations = embarcations;

  // La liste des pêcheurs n'est chargée qu'à l'ouverture du formulaire.
  useEffect(() => {
    if ((showModal || showEditModal) && pecheurs.length === 0) {
      listPecheurs({ year: selectedYear }).then(setPecheurs).catch(() => setErrorMsg('Impossible de charger les pêcheurs.'));
    }
  }, [showModal, showEditModal, selectedYear, pecheurs.length]);

  const actifs = counts.ACTIF || 0;

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

  const handleExport = async () => {
    const rows = await fetchAllPages((page, limit) => pageEmbarcations({ year: selectedYear, page, limit, search: list.appliedSearch, statut: list.statutValue }));
    const data = [
      ['Nom', 'Immatriculation', 'Type', 'Taille (m)', 'Moteur', 'Propriétaire', 'Statut'],
      ...rows.map(e => [
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
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{yearTotal}</h3>
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
          <Pagination page={list.page} totalPages={list.totalPages} total={list.meta.total} unit="embarcation" onChange={list.setPage} />
        </div>
      </div>

      {showModal && <EmbarcationFormModal title="Nouvelle Embarcation" formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onClose={() => setShowModal(false)} pecheurs={pecheurs} />}
      {showEditModal && selectedEmbarcation && <EmbarcationFormModal title="Modifier l'Embarcation" formData={formData} setFormData={setFormData} onSubmit={handleUpdate} onClose={() => setShowEditModal(false)} pecheurs={pecheurs} />}
      {showViewModal && selectedEmbarcation && <EmbarcationDetailModal item={selectedEmbarcation} onClose={() => setShowViewModal(false)} />}
    </DashboardLayout>
  );
}
