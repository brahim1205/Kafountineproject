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
  categorie?: string;
  service?: string;
  quantite?: number;
  unite?: string;
  tarifUnitaire?: number;
  statut?: string;
  localisation?: string;
  nature?: string;
  description?: string;
};

type UiDossier = Omit<DossierUrbanisme, 'date' | 'surface' | 'statut'> & {
  date: string;
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
  const [formValues, setFormValues] = useState({
    nomComplet: '',
    localisation: '',
    surface: '',
    nature: '',
    description: '',
  });

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
        const services = await getTaxServices('urbanisme-habitat');
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

      const surface = selectedPermis.unite === 'm²' ? parseInt(formData.get('surface') as string) || 0 : undefined;
      const montantTotal =
        selectedPermis.unite === 'm²'
          ? selectedPermis.tarif * Math.max(1, surface || 1)
          : selectedPermis.tarif;

      // First ensure the contribuable exists
      const contribuable = await ensureContribuableByIdentity({
        fullName: (formData.get('nomComplet') as string) || '',
      });

      // Create the urbanisme dossier
      await createDossierUrbanisme({
        contribuableId: contribuable.id,
        type: typePermis,
        description: formData.get('description') as string || '',
        surface,
        localisation: formData.get('localisation') as string || '',
        nature: formData.get('nature') as string || '',
        montant: montantTotal,
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
        agent: 'Agent Urbanisme',
        categorie: 'Urbanisme & habitat',
        service: selectedPermis.nom,
        quantite: selectedPermis.unite === 'm²' ? Math.max(1, surface || 1) : 1,
        unite: selectedPermis.unite,
        tarifUnitaire: selectedPermis.tarif,
        statut: userRole === 'admin' ? 'VALIDE' : 'EN_ATTENTE',
        localisation: (formData.get('localisation') as string) || '',
        nature: (formData.get('nature') as string) || '',
        description: (formData.get('description') as string) || '',
      };

      setTransactionData(newTransaction);
      setShowModal(false);
      setTypePermis('');
      setFormValues({
        nomComplet: '',
        localisation: '',
        surface: '',
        nature: '',
        description: '',
      });
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



  const handleImprimerRecuDossier = (dossier: UiDossier) => {
    const now = new Date();
    const c = dossier.contribuable;
    const contributorName = c ? `${c.prenom} ${c.nom}`.trim() : 'Inconnu';

    const recuData = {
      numero: dossier.numero,
      date: dossier.date,
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      contribuable: contributorName,
      type: `${dossier.type}`,
      montant: dossier.montant,
      agent: dossier.agent || 'Agent Urbanisme',
      categorie: 'Urbanisme & habitat',
      service: dossier.type,
      localisation: dossier.localisation,
      nature: dossier.nature || dossier.type,
      description: dossier.description || '',
      statut: dossier.statut,
      telephone: c?.telephone,
      nin: c?.nin,
      adresse: c?.adresse || dossier.localisation,
    };
    setTransactionData(recuData);
    setShowDetailModal(false);
    setShowRecuPDF(true);
  };

  const selectedPermis = typesPermis.find(p => p.id === typePermis);
  const surfaceValue = Number.parseInt(formValues.surface, 10);
  const effectiveSurface = Number.isNaN(surfaceValue) || surfaceValue < 1 ? 1 : surfaceValue;
  const montantEstime = selectedPermis
    ? selectedPermis.unite === 'm²'
      ? selectedPermis.tarif * effectiveSurface
      : selectedPermis.tarif
    : 0;

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
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <i className="ri-loader-4-line animate-spin text-teal-500"></i>
                      <span>Chargement des dossiers...</span>
                    </div>
                  </td>
                </tr>
              ) : !dossiers || dossiers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Aucun dossier trouvé
                  </td>
                </tr>
              ) : dossiers.map((dossier) => (
                <tr key={dossier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{dossier.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dossier.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{dossier.type}</td>
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
                <div>
                </div>
                <div>
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-5 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Nouveau dossier d'urbanisme</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Enregistrement officiel - Commune de Kafountine</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Type de permis / Autorisation <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <i className="ri-file-list-3-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <select
                        data-required="true"
                        value={typePermis}
                        onChange={(e) => {
                          setTypePermis(e.target.value);
                          setFormValues((current) => ({ ...current, surface: '' }));
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500 transition-all appearance-none"
                      >
                        <option value="">Sélectionnez un type</option>
                        {typesPermis.map(permis => (
                          <option key={permis.id} value={permis.id}>
                            {permis.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    Nom Complet du Demandeur <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <i className="ri-user-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      name="nomComplet"
                      value={formValues.nomComplet}
                      onChange={(e) => setFormValues((current) => ({ ...current, nomComplet: e.target.value }))}
                      data-required="true"
                      placeholder="Ex: El Hadji Malick Sy"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                  </div>
                </div>

                


                

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Localisation précise du projet <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <i className="ri-map-pin-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="text"
                        name="localisation"
                        value={formValues.localisation}
                        onChange={(e) => setFormValues((current) => ({ ...current, localisation: e.target.value }))}
                        data-required="true"
                        placeholder="Ex: Quartier Abéné, Parcelle n°45"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  {selectedPermis?.unite === 'm²' && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Surface totale (m²) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <i className="ri-ruler-2-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                          type="number"
                          name="surface"
                          value={formValues.surface}
                          onChange={(e) => setFormValues((current) => ({ ...current, surface: e.target.value }))}
                          data-required="true"
                          min="1"
                          placeholder="Ex: 250"
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className={selectedPermis?.unite === 'm²' ? '' : 'md:col-span-2'}>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Nature du projet <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <i className="ri-building-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <select
                        name="nature"
                        value={formValues.nature}
                        onChange={(e) => setFormValues((current) => ({ ...current, nature: e.target.value }))}
                        data-required="true"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500 transition-all appearance-none"
                      >
                        <option value="">Sélectionnez la nature</option>
                        <option value="habitation">Usage d'habitation</option>
                        <option value="commerce">Usage commercial</option>
                        <option value="industrie">Usage industriel</option>
                        <option value="mixte">Usage mixte (Habitat + Commerce)</option>
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Description complémentaire
                    </label>
                    <textarea
                      name="description"
                      value={formValues.description}
                      onChange={(e) => setFormValues((current) => ({ ...current, description: e.target.value }))}
                      rows={3}
                      placeholder="Précisez les détails du projet (ex: nombre d'étages, type de clôture...)"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                    ></textarea>
                  </div>
              </div>

              {/* Récapitulatif de paiement Premium */}
              {selectedPermis && (
                <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                  <div className="relative flex justify-between items-center text-white">
                    <div>
                      <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest mb-1">Estimation des Droits de Voirie</p>
                      <h4 className="text-sm font-bold mb-2">{selectedPermis.nom}</h4>
                      <div className="flex items-center gap-3 text-teal-50/70 text-[10px] font-medium">
                        <span>Tarif: {selectedPermis.tarif.toLocaleString()} F / {selectedPermis.unite}</span>
                        {selectedPermis.unite === 'm²' && (
                          <>
                            <span className="w-1 h-1 bg-teal-400 rounded-full"></span>
                            <span>Base calcul: {effectiveSurface} m²</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black">{montantEstime.toLocaleString()} <span className="text-xs opacity-60">FCFA</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-8 py-4 bg-gray-100 text-gray-500 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-[2] px-8 py-4 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-teal-200 transition-all flex items-center justify-center gap-3 ${
                    isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 hover:shadow-xl'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-xl"></i>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-checkbox-circle-line text-xl"></i>
                      <span>Créer le dossier</span>
                    </>
                  )}
                </button>
              </div>

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600 animate-shake">
                  <i className="ri-error-warning-line text-xl"></i>
                  <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
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
