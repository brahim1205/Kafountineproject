import { useState, useEffect } from 'react';
import RecuPDF from '../../../components/feature/RecuPDF';
import { createDossierUrbanisme, getDossiersUrbanisme, type DossierUrbanisme } from '../../../services/urbanisme';
import { ensureContribuableByIdentity } from '../../../services/contribuables';
import { useYear } from '../../../contexts/YearContext';
import { getTaxServices, type TaxService } from '../../../services/taxes';
import { getStoredUserRole } from '../../../services/auth';
import {
  clearFieldValidationError,
  validateFormElement,
} from '../../../utils/formValidation';

type ReceiptData = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
};

type UiDossier = Omit<DossierUrbanisme, 'date' | 'surface' | 'statut'> & {
  date: string;
  demandeur: string;
  cni: string;
  telephone: string;
  adresse: string;
  surface: string;
  statut: string;
};

export default function GestionDossiers() {
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userRole = getStoredUserRole() || 'admin';
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showRecuPDF, setShowRecuPDF] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<UiDossier | null>(null);
  const [typePermis, setTypePermis] = useState('');
  const [transactionData, setTransactionData] = useState<ReceiptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dossiers, setDossiers] = useState<UiDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [typesPermis, setTypesPermis] = useState<TaxService[]>([]);

  // Fetch dossiers from API
  const fetchDossiers = async () => {
    try {
      setLoading(true);
      const result = await getDossiersUrbanisme({ limit: 100, year: selectedYear });
      
      if (!result) {
        setDossiers([]);
        setLoading(false);
        return;
      }
      
      const apiData = result.data || result;
      
      if (!Array.isArray(apiData)) {
        setDossiers([]);
        setLoading(false);
        return;
      }
      
      // Transform API data to match component format - simplified
      const transformedDossiers = apiData.map((dossier: DossierUrbanisme): UiDossier => {
        const typePermisObj = typesPermis.find(tp => tp.id === dossier.type);
        return {
          ...dossier,
          date: dossier.createdAt ? new Date(dossier.createdAt).toLocaleDateString('fr-FR') : '-',
          type: typePermisObj?.nom || dossier.type || '-',
          demandeur: 'Demandeur',
          cni: '-',
          telephone: '-',
          adresse: '-',
          localisation: dossier.localisation || '-',
          surface: dossier.surface ? `${dossier.surface} m²` : '-',
          montant: dossier.montant || 0,
          statut: dossier.statut === 'VALIDE' ? 'Validé' : dossier.statut === 'REJETE' ? 'Rejeté' : 'En attente'
        };
      });
      setDossiers(transformedDossiers);
    } catch {
      setDossiers([]);
      setError("Impossible de charger les dossiers d'urbanisme.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossiers();
  }, [selectedYear]);

  useEffect(() => {
    const loadTarifs = async () => {
      try {
        const services = await getTaxServices('urbanisme');
        setTypesPermis(services);
      } catch {
        setError('Impossible de charger les tarifs urbanisme.');
      }
    };

    loadTarifs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const selectedPermis = typesPermis.find(p => p.id === typePermis);
      if (!selectedPermis) {
        setError('Veuillez sélectionner un type de permis');
        setIsSubmitting(false);
        return;
      }

      const surface = selectedPermis.unite === 'm²' ? parseInt(formData.get('surface') as string) || 0 : 1;
      const montantTotal = selectedPermis.tarif * surface;

      // First ensure the contribuable exists
      const contribuable = await ensureContribuableByIdentity({
        cni: (formData.get('cni') as string) || '',
        fullName: (formData.get('nomComplet') as string) || '',
        telephone: (formData.get('telephone') as string) || '',
        adresse: (formData.get('adresse') as string) || '',
      });

      // Create the urbanisme dossier
      await createDossierUrbanisme({
        contribuableId: contribuable.id,
        type: typePermis,
        description: formData.get('description') as string || '',
        surface: surface,
        localisation: formData.get('localisation') as string || '',
      });

      // Créer les données de transaction pour le reçu
      const numeroTransaction = `URB-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`;
      const now = new Date();
      
      const newTransaction = {
        numero: numeroTransaction,
        date: now.toLocaleDateString('fr-FR'),
        heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        contribuable: formData.get('nomComplet') as string,
        type: `${selectedPermis.nom}${selectedPermis.unite === 'm²' ? ` (${surface} m²)` : ''}`,
        montant: montantTotal,
        agent: 'Agent Urbanisme'
      };

      setTransactionData(newTransaction);
      setShowModal(false);
      setTypePermis('');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      // Rafraîchir la liste des dossiers
      fetchDossiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le dossier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoir = (dossier: UiDossier) => {
    setSelectedDossier(dossier);
    setShowDetailModal(true);
  };

  const handleTelecharger = (dossier: UiDossier) => {
    // Simuler le téléchargement
    const link = document.createElement('a');
    link.href = '#';
    link.download = `${dossier.numero}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImprimerRecuDossier = (dossier: UiDossier) => {
    const now = new Date();
    const recuData = {
      numero: dossier.numero,
      date: dossier.date,
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      contribuable: dossier.demandeur,
      type: `${dossier.type} - ${dossier.localisation}`,
      montant: dossier.montant,
      agent: 'Agent Urbanisme'
    };
    setTransactionData(recuData);
    setShowDetailModal(false);
    setShowRecuPDF(true);
  };

  const selectedPermis = typesPermis.find(p => p.id === typePermis);

  return (
    <div className="space-y-4">
      {/* Message de succès */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-teal-200 p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <i className="ri-check-line text-teal-600 text-xl"></i>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Dossier créé avec succès !</p>
            <p className="text-xs text-gray-600">Le dossier a été enregistré</p>
            {transactionData && (
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setShowRecuPDF(true);
                }}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-1 underline"
              >
                Imprimer le reçu
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bouton nouveau dossier */}
      <div className="flex justify-end">
        {userRole !== 'super_admin' && isCurrentYear && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nouveau dossier
          </button>
        )}
      </div>

      {/* Liste des dossiers */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Numéro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Demandeur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Localisation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Surface</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Statut</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <i className="ri-loader-4-line animate-spin text-teal-500"></i>
                      <span>Chargement des dossiers...</span>
                    </div>
                  </td>
                </tr>
              ) : !dossiers || dossiers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Aucun dossier trouvé
                  </td>
                </tr>
              ) : dossiers.map((dossier) => (
                <tr key={dossier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{dossier.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dossier.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{dossier.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{dossier.demandeur}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dossier.localisation}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dossier.surface}</td>
                  <td className="px-4 py-3 text-sm font-medium text-teal-600 whitespace-nowrap">{dossier.montant.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                      dossier.statut === 'Validé' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {dossier.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleVoir(dossier)}
                        className="w-8 h-8 flex items-center justify-center text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <i className="ri-eye-line"></i>
                      </button>
                      {dossier.statut === 'Validé' && (
                        <button 
                          onClick={() => handleTelecharger(dossier)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <i className="ri-download-line"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détail dossier */}
      {showDetailModal && selectedDossier && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Détails du dossier</h3>
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
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date de dépôt</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Type de permis</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Statut</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    selectedDossier.statut === 'Validé' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedDossier.statut}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Demandeur</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.demandeur}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Numéro CNI</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.cni}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.telephone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Adresse</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.adresse}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Localisation du projet</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.localisation}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Surface</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.surface}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nature du projet</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.nature || selectedDossier.type}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDossier.description}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Montant</p>
                  <p className="text-sm font-bold text-teal-600">{selectedDossier.montant.toLocaleString()} FCFA</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleImprimerRecuDossier(selectedDossier)}
                  className="flex-1 px-4 py-2.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors whitespace-nowrap"
                >
                  <i className="ri-printer-line mr-2"></i>
                  Imprimer le reçu
                </button>
                {selectedDossier.statut === 'Validé' && (
                  <button
                    onClick={() => handleTelecharger(selectedDossier)}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-download-line mr-2"></i>
                    Télécharger
                  </button>
                )}
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

      {/* Modal nouveau dossier */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Nouveau dossier d'urbanisme</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type de permis */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de permis <span className="text-red-500">*</span>
                  </label>
                  <select
                    data-required="true"
                    value={typePermis}
                    onChange={(e) => setTypePermis(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Sélectionnez un type</option>
                    {typesPermis.map(permis => (
                      <option key={permis.id} value={permis.id}>
                        {permis.nom} - {permis.tarif} FCFA{permis.unite !== 'document' ? `/${permis.unite}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Informations demandeur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nomComplet"
                    data-required="true"
                    placeholder="Ex: Ibrahima Sarr"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro CNI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cni"
                    data-required="true"
                    placeholder="Ex: 1234567890123"
                    maxLength={13}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    data-required="true"
                    placeholder="Ex: 77 123 45 67"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="adresse"
                    data-required="true"
                    placeholder="Ex: Quartier Nord, Kafountine"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Informations projet */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Localisation du projet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="localisation"
                    data-required="true"
                    placeholder="Ex: Parcelle 123, Quartier Nord"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {selectedPermis?.unite === 'm²' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Surface (m²) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="surface"
                      data-required="true"
                      min="1"
                      placeholder="Ex: 150"
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nature du projet <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="nature"
                    data-required="true"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Sélectionnez</option>
                    <option value="habitation">Habitation</option>
                    <option value="commerce">Commerce</option>
                    <option value="industrie">Industrie</option>
                    <option value="mixte">Mixte</option>
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description du projet
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Décrivez brièvement le projet..."
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Récapitulatif */}
              {selectedPermis && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Montant à payer</p>
                      <p className="text-xs text-gray-600 mt-0.5">{selectedPermis.nom}</p>
                    </div>
                    <p className="text-2xl font-bold text-teal-600">
                      {selectedPermis.tarif.toLocaleString()} FCFA{selectedPermis.unite !== 'document' ? `/${selectedPermis.unite}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 text-white text-sm font-medium rounded-lg whitespace-nowrap ${
                    isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600 transition-colors'
                  }`}
                >
                  <i className={`ri-${isSubmitting ? 'loader-4-line animate-spin' : 'check-line'} mr-2`}></i>
                  {isSubmitting ? 'Enregistrement...' : 'Créer le dossier'}
                </button>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  <i className="ri-error-warning-line mr-2"></i>
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal Reçu PDF */}
      {showRecuPDF && transactionData && (
        <RecuPDF
          transaction={transactionData}
          onClose={() => {
            setShowRecuPDF(false);
            setTransactionData(null);
          }}
        />
      )}
    </div>
  );
}
