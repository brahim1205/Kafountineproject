import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { getPenalites, type Penalite } from '../../services/settings';
import { listContribuables, type Contribuable } from '../../services/contribuables';
import RecuPDF from '../../components/feature/RecuPDF';

export default function Penalites() {
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [contribuables, setContribuables] = useState<Contribuable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [selectedPenalite, setSelectedPenalite] = useState<Penalite | null>(null);
  const [selectedContribuable, setSelectedContribuable] = useState<Contribuable | null>(null);
  const [receiptData, setReceiptData] = useState<Record<string, unknown> | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [penalitesData, contribuablesData] = await Promise.all([
        getPenalites(),
        listContribuables({ limit: 100 })
      ]);
      setPenalites(penalitesData.filter((p: Penalite) => p.actif));
      setContribuables(contribuablesData || []);
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

  const handleAssociate = () => {
    if (!selectedContribuable || !selectedPenalite) {
      showError('Veuillez sélectionner un contribuable et une pénalité.');
      return;
    }

    const now = new Date();
    const data = {
      ticketNumber: `PEN-${now.getFullYear()}-${Date.now().toString().slice(-6)}`,
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      contributor: `${selectedContribuable.prenom} ${selectedContribuable.nom}`,
      type: `Pénalité (${selectedPenalite.type})`,
      amount: selectedPenalite.montant,
      agent: 'Agent Municipal',
      nin: selectedContribuable.nin,
      telephone: selectedContribuable.telephone,
      adresse: selectedContribuable.adresse,
      description: selectedPenalite.description,
      statut: 'Validé'
    };

    setReceiptData(data);
    showSuccess(`Pénalité appliquée avec succès.`);
    setShowAssociateModal(false);
    setShowPdfPreview(true);
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
              <i className="ri-alert-circle-line text-3xl text-gray-400"></i>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Contribuables enregistrés</p>
                <p className="text-2xl font-bold text-teal-600">{contribuables.length}</p>
              </div>
              <i className="ri-user-line text-3xl text-teal-500"></i>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Liste des Pénalités</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
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
                        <span className="font-semibold text-teal-600">{formatMontant(penalite.montant)} FCFA</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{penalite.delai}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            setSelectedPenalite(penalite);
                            setShowAssociateModal(true);
                          }}
                          className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 inline-flex"
                        >
                          <i className="ri-hand-coin-line"></i>
                          Appliquer
                        </button>
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
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm">
                <p className="text-gray-600">Type : <span className="font-bold">{selectedPenalite.type}</span></p>
                <p className="text-gray-600">Montant : <span className="font-bold text-teal-600">{formatMontant(selectedPenalite.montant)} FCFA</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher un contribuable</label>
                <input
                  type="text"
                  placeholder="Nom, NIN ou téléphone..."
                  onChange={(e) => {
                    const term = e.target.value.toLowerCase();
                    const found = contribuables.find(c => 
                      `${c.nom} ${c.prenom}`.toLowerCase().includes(term) || 
                      c.nin?.includes(term) || 
                      c.telephone?.includes(term)
                    );
                    setSelectedContribuable(found || null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {selectedContribuable && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="font-bold">{selectedContribuable.prenom} {selectedContribuable.nom}</p>
                  <p className="text-gray-600">NIN: {selectedContribuable.nin || '-'}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowAssociateModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg">
                  Annuler
                </button>
                <button
                  onClick={handleAssociate}
                  disabled={!selectedContribuable}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  <i className="ri-printer-line"></i>
                  Valider et imprimer
                </button>
              </div>
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