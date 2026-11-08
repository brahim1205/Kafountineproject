import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { getPenalites, type Penalite } from '../../services/settings';
import { canWriteData, getStoredUserName } from '../../services/auth';
import { createTransaction } from '../../services/taxes';
import RecuPDF from '../../components/feature/RecuPDF';
import ContribuableSelect, { requireSelectedContribuable } from '../../components/feature/ContribuableSelect';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../utils/formValidation';

const INPUT_CLASS = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500';

export default function Penalites() {
  // L'administrateur est en consultation seule : il voit les pénalités sans les appliquer.
  const canApply = canWriteData();
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [selectedPenalite, setSelectedPenalite] = useState<Penalite | null>(null);
  const [applying, setApplying] = useState(false);
  const [receiptData, setReceiptData] = useState<Record<string, unknown> | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const penalitesData = await getPenalites();
      setPenalites(penalitesData.filter((p: Penalite) => p.actif));
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  /** Enregistre la pénalité comme une recette, puis imprime le reçu à son vrai numéro. */
  const handleAssociate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!selectedPenalite || !validateFormElement(form)) return;
    const contribuableId = requireSelectedContribuable(form, 'contribuableId');
    if (!contribuableId) return;
    const label = String(new FormData(form).get('contribuableRecherche') || '');
    const nin = label.match(/\(([^)]*)\)\s*$/)?.[1] || '';

    setApplying(true);
    try {
      const type = `Pénalité (${selectedPenalite.type})`;
      const created = await createTransaction({
        contribuableId,
        categorie: 'Pénalités',
        type,
        service: type,
        quantite: 1,
        montant: selectedPenalite.montant,
        modePaiement: 'ESPECE',
        reference: `PEN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      });
      const date = created?.date ? new Date(created.date) : new Date();
      setReceiptData({
        ticketNumber: created.numero,
        date: date.toLocaleDateString('fr-FR'),
        time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        contributor: label.replace(/\s*\([^)]*\)\s*$/, ''),
        type,
        amount: selectedPenalite.montant,
        agent: getStoredUserName() || 'Agent Municipal',
        nin,
        description: selectedPenalite.description,
        statut: 'Validé',
      });
      showSuccess(`Pénalité enregistrée sous le numéro ${created.numero}.`);
      setShowAssociateModal(false);
      setShowPdfPreview(true);
    } catch (error) {
      showError(getErrorMessage(error, "Impossible d'enregistrer la pénalité."));
    } finally {
      setApplying(false);
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant);
  };

  const filteredPenalites = penalites.filter(p =>
    p.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Consultation des Pénalités</h1>
          <p className="text-gray-600 mt-1">Consultez les pénalités et appliquez-les aux contribuables</p>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <i className="ri-checkbox-circle-line text-green-600 text-xl"></i>
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <i className="ri-error-warning-line text-red-600 text-xl"></i>
            <p className="text-red-800 text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pénalités disponibles</p>
                <p className="text-2xl font-bold text-gray-900">{penalites.length}</p>
              </div>
              <i className="ri-error-warning-line text-3xl text-gray-400"></i>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Rechercher une pénalité..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Liste des Pénalités</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-2">Chargement...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Délai</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPenalites.map((penalite) => (
                    <tr key={penalite.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{penalite.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{penalite.description || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-emerald-600">{formatMontant(penalite.montant)} FCFA</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{penalite.delai}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {canApply && (
                        <button
                          onClick={() => {
                            setSelectedPenalite(penalite);
                            setShowAssociateModal(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 inline-flex"
                        >
                          <i className="ri-hand-coin-line"></i>
                          Appliquer
                        </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAssociateModal && selectedPenalite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAssociateModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Appliquer la pénalité</h3>
              <button onClick={() => setShowAssociateModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
                <p className="text-gray-600">Type : <span className="font-bold">{selectedPenalite.type}</span></p>
                <p className="text-gray-600">Montant : <span className="font-bold text-emerald-600">{formatMontant(selectedPenalite.montant)} FCFA</span></p>
              </div>

              <form onSubmit={handleAssociate} onInput={clearFieldValidationError} noValidate className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contribuable</label>
                  <ContribuableSelect name="contribuableId" inputClassName={INPUT_CLASS} />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowAssociateModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg">
                    Annuler
                  </button>
                  <button type="submit" disabled={applying} className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                    <i className="ri-printer-line"></i>
                    {applying ? 'Enregistrement...' : 'Valider et imprimer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPdfPreview && receiptData && (
        <RecuPDF
          {...receiptData}
          onClose={() => {
            setShowPdfPreview(false);
            setReceiptData(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}