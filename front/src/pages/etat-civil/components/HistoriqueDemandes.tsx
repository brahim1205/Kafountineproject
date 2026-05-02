import { useEffect, useMemo, useState } from 'react';
import RecuPDF from '../../../components/feature/RecuPDF';
import { listEtatCivilDemandes, updateEtatCivilDemande, deleteEtatCivilDemande, type EtatCivilDemande } from '../../../services/etatCivil';
import { listContribuables, type Contribuable } from '../../../services/contribuables';
import { useYear } from '../../../contexts/YearContext';
import { getStoredUserRole } from '../../../services/auth';
import { useToast } from '../../../components/feature/Toast';
import {
  clearFieldValidationError,
  getErrorMessage,
  validateFormElement,
} from '../../../utils/formValidation';

type UiEtatCivilDemande = EtatCivilDemande & {
  demandeur: string;
  cni: string;
  telephone: string;
  date: string;
  heure: string;
  agent: string;
};

export default function HistoriqueDemandes() {
  const { selectedYear } = useYear();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<UiEtatCivilDemande | null>(null);
  const [selectedEditDemande, setSelectedEditDemande] = useState<UiEtatCivilDemande | null>(null);
  const [demandes, setDemandes] = useState<UiEtatCivilDemande[]>([]);
  const [contribuables, setContribuables] = useState<Contribuable[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const userRole = getStoredUserRole();
  const { showToast } = useToast();

  const loadDemandes = () => {
    listEtatCivilDemandes(selectedYear)
      .then((data) => {
        setErrorMsg('');
        const mapped = (data || []).map((d: EtatCivilDemande): UiEtatCivilDemande => ({
          ...d,
          demandeur: d.contribuable ? `${d.contribuable.prenom || ''} ${d.contribuable.nom || ''}`.trim() : '-',
          cni: d.contribuable?.nin || '-',
          telephone: d.contribuable?.telephone || '-',
          date: d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
          heure: d.date ? new Date(d.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
          agent: d.agent || 'Agent Municipal',
        }));
        setDemandes(mapped);
      })
      .catch(() => {
        setDemandes([]);
        setErrorMsg("Impossible de charger l'historique de l'état civil.");
      });
  };

  useEffect(() => {
    loadDemandes();
    listContribuables().then(setContribuables).catch(() => {});
  }, [selectedYear]);

  const filteredDemandes = useMemo(() => demandes.filter(demande => {
    const matchSearch = demande.demandeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       demande.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       demande.cni.includes(searchTerm);
    const matchType = filterType === 'tous' || demande.typeDocument === filterType;
    return matchSearch && matchType;
  }), [demandes, searchTerm, filterType]);

  const handleVoir = (demande: UiEtatCivilDemande) => {
    setSelectedDemande(demande);
    setShowDetailModal(true);
  };

  const handleImprimer = (demande: UiEtatCivilDemande) => {
    setSelectedDemande(demande);
    setShowRecuModal(true);
  };

  const handleEdit = (demande: UiEtatCivilDemande) => {
    setSelectedEditDemande(demande);
    setShowEditModal(true);
  };

  const handleUpdateDemande = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEditDemande) return;
    if (!validateFormElement(e.currentTarget)) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const typeDocument = String(formData.get('typeDocument') || '');
    const contribuableId = String(formData.get('contribuableId') || '');
    const montant = Number(formData.get('montant') || 0);
    const exemplaires = Number(formData.get('exemplaires') || 1);
    const statut = String(formData.get('statut') || 'DELIVREE');

    try {
      await updateEtatCivilDemande(selectedEditDemande.id, {
        typeDocument,
        contribuableId,
        montant,
        exemplaires,
        statut,
      });
      showToast('Demande mise à jour avec succès.', 'success');
      setShowEditModal(false);
      setSelectedEditDemande(null);
      loadDemandes();
    } catch (error) {
      showToast(getErrorMessage(error, 'Erreur lors de la mise à jour.'), 'error');
    }
  };

  const handleDeleteDemande = async () => {
    if (!selectedEditDemande) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette demande définitivement ? Cette action est irréversible.")) return;

    try {
      await deleteEtatCivilDemande(selectedEditDemande.id);
      showToast('Demande supprimée avec succès.', 'success');
      setShowEditModal(false);
      setSelectedEditDemande(null);
      loadDemandes();
    } catch (error) {
      showToast(getErrorMessage(error, 'Erreur lors de la suppression.'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {/* Filtres */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom, numéro ou CNI..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de document</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="tous">Tous les documents</option>
              <option value="Extrait de naissance">Extrait de naissance</option>
              <option value="Certificat de résidence">Certificat de résidence</option>
              <option value="Légalisation de signature">Légalisation de signature</option>
              <option value="Certificat de vie">Certificat de vie</option>
              <option value="Certificat de célibat">Certificat de célibat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Type de document</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Demandeur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">CNI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Agent</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDemandes.map((demande) => (
                <tr key={demande.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {demande.date}
                    <span className="block text-xs text-gray-500">{demande.heure}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{demande.typeDocument}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{demande.demandeur}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{demande.cni}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{demande.telephone}</td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-600 whitespace-nowrap">{demande.montant.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{demande.agent}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleVoir(demande)}
                        className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <i className="ri-eye-line"></i>
                      </button>
                      {(userRole === 'admin' || userRole === 'super_admin') ? (
                        <button 
                          onClick={() => handleEdit(demande)}
                          className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleImprimer(demande)}
                          className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Imprimer le reçu"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDemandes.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-file-list-3-line text-4xl text-gray-300 mb-3"></i>
            <p className="text-sm text-gray-500">Aucune demande trouvée</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-600">
          Affichage de <span className="font-medium">{filteredDemandes.length}</span> demande(s)
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
            Précédent
          </button>
          <button className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap">
            1
          </button>
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
            Suivant
          </button>
        </div>
      </div>

      {showEditModal && selectedEditDemande && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Modifier la demande {selectedEditDemande.numero}</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedEditDemande(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleUpdateDemande} onInput={clearFieldValidationError} noValidate className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de document</label>
                  <select
                    name="typeDocument"
                    data-required="true"
                    defaultValue={selectedEditDemande.typeDocument}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                  >
                    <option value="Extrait de naissance">Extrait de naissance</option>
                    <option value="Certificat de résidence">Certificat de résidence</option>
                    <option value="Légalisation de signature">Légalisation de signature</option>
                    <option value="Certificat de vie">Certificat de vie</option>
                    <option value="Certificat de célibat">Certificat de célibat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contribuable</label>
                  <select
                    name="contribuableId"
                    data-required="true"
                    defaultValue={selectedEditDemande.contribuableId}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                  >
                    <option value="">Sélectionner un contribuable</option>
                    {contribuables.map((c) => (
                      <option key={c.id} value={c.id}>
                        {`${c.prenom || ''} ${c.nom || ''}`.trim()} ({c.nin})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exemplaires</label>
                    <input
                      type="number"
                      name="exemplaires"
                      data-required="true"
                      min="1"
                      defaultValue={selectedEditDemande.exemplaires}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FCFA)</label>
                    <input
                      type="number"
                      name="montant"
                      data-required="true"
                      min="0"
                      defaultValue={selectedEditDemande.montant}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <select
                    name="statut"
                    data-required="true"
                    defaultValue={selectedEditDemande.statut}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                  >
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="DELIVREE">Délivrée</option>
                    <option value="REJETEE">Rejetée</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={handleDeleteDemande}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <i className="ri-delete-bin-line"></i>
                    Supprimer la demande
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                    >
                      <i className="ri-save-line"></i>
                      Enregistrer
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetailModal && selectedDemande && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Détails de la demande</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Numéro</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDemande.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date et heure</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDemande.date} à {selectedDemande.heure}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Type de document</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDemande.typeDocument}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Demandeur</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDemande.demandeur}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Numéro CNI</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDemande.cni}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDemande.telephone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Montant payé</p>
                  <p className="text-sm font-bold text-emerald-600">{selectedDemande.montant.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Agent</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDemande.agent}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleImprimer(selectedDemande);
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
                >
                  <i className="ri-printer-line mr-2"></i>
                  Imprimer le reçu
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reçu PDF */}
      {showRecuModal && selectedDemande && (
        <RecuPDF
          numeroRecu={selectedDemande.numero}
          date={selectedDemande.date}
          heure={selectedDemande.heure}
          contribuable={selectedDemande.demandeur}
          typeTaxe={selectedDemande.typeDocument}
          montant={selectedDemande.montant}
          agent={selectedDemande.agent}
          onClose={() => setShowRecuModal(false)}
        />
      )}
    </div>
  );
}
