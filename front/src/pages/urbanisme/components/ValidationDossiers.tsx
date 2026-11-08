import { useState, useEffect } from 'react';
import { getDossiersUrbanisme, updateDossierUrbanisme, DossierUrbanisme } from '../../../services/urbanisme';
import { useYear } from '../../../contexts/YearContext';
import { useToast } from '../../../components/feature/Toast';

type PendingDossier = {
  id: string;
  numero: string;
  date: string;
  type: string;
  localisation: string;
  surface: string;
  montant: number;
  description: string;
  demandeurNom: string;
  demandeurTelephone: string;
  demandeurAdresse: string;
  createdAt: string;
  action?: 'valider' | 'rejeter';
};

export default function ValidationDossiers() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<PendingDossier | null>(null);
  const [dossiersEnAttente, setDossiersEnAttente] = useState<PendingDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchDossiers = async () => {
    try {
      setLoading(true);
      const result = await getDossiersUrbanisme({ limit: 100, year: selectedYear });
      
      const pendingDossiers = (result.data || [])
        .filter((d: DossierUrbanisme) => d.statut === 'EN_ATTENTE')
        .map((d: DossierUrbanisme): PendingDossier => ({
          id: d.id,
          numero: d.numero,
          date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '-',
          type: formatType(d.type),
          localisation: d.localisation || '-',
          surface: d.surface ? `${d.surface} m²` : '-',
          montant: d.montant || 0,
          description: d.description || '-',
          demandeurNom: '-',
          demandeurTelephone: '-',
          demandeurAdresse: '-',
          createdAt: d.createdAt,
        }));
      
      setDossiersEnAttente(pendingDossiers);
    } catch {
      setDossiersEnAttente([]);
      showToast("Impossible de charger les dossiers d'urbanisme.", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossiers();
  }, [selectedYear]);

  function formatType(type: string): string {
    const types: Record<string, string> = {
      'permis-construire': 'Permis de construire',
      'autorisation-travaux': 'Autorisation de travaux',
      'certificat-conformite': 'Certificat de conformite',
      'titre-foncier': 'Titre foncier',
    };
    return types[type] || type;
  }

  const handleConsulter = (dossier: PendingDossier) => {
    setSelectedDossier(dossier);
    setShowDetailModal(true);
  };

  const handleValidation = (dossier: PendingDossier, action: 'valider' | 'rejeter') => {
    setSelectedDossier({ ...dossier, action });
    setShowDetailModal(false);
    setShowValidationModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedDossier) return;
    
    setSubmitting(true);
    try {
      const newStatut = selectedDossier.action === 'valider' ? 'VALIDE' : 'REJETE';
      await updateDossierUrbanisme(selectedDossier.id, { statut: newStatut });
      
      showToast(
        selectedDossier.action === 'valider' 
          ? `Dossier ${selectedDossier.numero} validé avec succès` 
          : `Dossier ${selectedDossier.numero} rejeté`,
        selectedDossier.action === 'valider' ? 'success' : 'info'
      );
      
      await fetchDossiers();
      
      setShowValidationModal(false);
      setSelectedDossier(null);
    } catch {
      showToast('Erreur lors de la mise à jour du dossier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <i className="ri-time-line text-yellow-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{dossiersEnAttente.length}</p>
          <p className="text-sm text-gray-600">Dossiers en attente</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-emerald-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">-</p>
          <p className="text-sm text-gray-600">Validés ce mois</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <i className="ri-close-circle-line text-red-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">-</p>
          <p className="text-sm text-gray-600">Rejetés ce mois</p>
        </div>
      </div>

      {/* Liste des dossiers en attente */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Dossiers en attente de validation</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <i className="ri-loader-4-line animate-spin text-emerald-500 text-2xl mb-2"></i>
            <p>Chargement...</p>
          </div>
        ) : dossiersEnAttente.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <i className="ri-check-line text-4xl text-emerald-500 mb-2"></i>
            <p>Aucun dossier en attente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {dossiersEnAttente.map((dossier) => (
              <div
                key={dossier.id}
                onClick={() => handleConsulter(dossier)}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-base font-semibold text-gray-900">{dossier.numero}</h4>
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full whitespace-nowrap">
                        En attente
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Déposé le {dossier.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">{dossier.montant.toLocaleString()} FCFA</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Type de demande</p>
                    <p className="text-sm font-medium text-gray-900">{dossier.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Demandeur</p>
                    <p className="text-sm font-medium text-gray-900">{dossier.demandeurNom}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Localisation</p>
                    <p className="text-sm font-medium text-gray-900">{dossier.localisation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Surface</p>
                    <p className="text-sm font-medium text-gray-900">{dossier.surface}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleValidation(dossier, 'valider')}
                    className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                  >
                    <i className="ri-checkbox-circle-line"></i>
                    Valider
                  </button>
                  <button
                    onClick={() => handleValidation(dossier, 'rejeter')}
                    className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <i className="ri-close-circle-line"></i>
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de consultation */}
      {showDetailModal && selectedDossier && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedDossier.numero}</h3>
                <p className="text-sm text-gray-500">Détail du dossier d'urbanisme</p>
              </div>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedDossier(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-700 rounded-full">
                  En attente de validation
                </span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Demandeur</h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Nom complet</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDossier.demandeurNom}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDossier.demandeurTelephone}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500">Adresse</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDossier.demandeurAdresse}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Détails du projet</h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Type de demande</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDossier.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date de dépôt</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDossier.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Localisation</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDossier.localisation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Surface</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDossier.surface}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDossier.description}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Montant</h4>
                <div className="bg-emerald-50 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-sm text-emerald-700">Droits d'urbanisme</span>
                  <span className="text-xl font-bold text-emerald-700">{selectedDossier.montant.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedDossier(null); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => handleValidation(selectedDossier, 'rejeter')}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <i className="ri-close-circle-line"></i>
                Rejeter
              </button>
              <button
                onClick={() => handleValidation(selectedDossier, 'valider')}
                className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <i className="ri-checkbox-circle-line"></i>
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation */}
      {showValidationModal && selectedDossier && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                selectedDossier.action === 'valider' ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                <i className={`text-3xl ${
                  selectedDossier.action === 'valider' ? 'ri-checkbox-circle-line text-emerald-600' : 'ri-close-circle-line text-red-600'
                }`}></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedDossier.action === 'valider' ? 'Valider le dossier' : 'Rejeter le dossier'}
              </h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir {selectedDossier.action === 'valider' ? 'valider' : 'rejeter'} le dossier {selectedDossier.numero} ?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => { setShowValidationModal(false); setShowDetailModal(true); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    selectedDossier.action === 'valider' 
                      ? 'bg-emerald-500 hover:bg-emerald-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {submitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <i className={`ri-${selectedDossier.action === 'valider' ? 'checkbox-circle-line' : 'close-circle-line'}`}></i>
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
