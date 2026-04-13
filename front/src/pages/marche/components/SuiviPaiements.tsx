import { useEffect, useMemo, useState } from 'react';
import RecuPDF from '../../../components/feature/RecuPDF';
import {
  createPaiementMarche,
  getMarcheStats,
  listPaiementsMarche,
  type MarcheStats,
  type PaiementMarche,
} from '../../../services/marche';
import { getStoredUserRole } from '../../../services/auth';
import { useYear } from '../../../contexts/YearContext';
import { useToast } from '../../../components/feature/Toast';
import {
  clearFieldValidationError,
  getErrorMessage,
  validateFormElement,
} from '../../../utils/formValidation';

type PaymentStatusLabel = 'Payé' | 'En attente' | 'En retard';

type ReceiptData = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
};

type UiPaiementMarche = PaiementMarche & {
  numero: string;
  occupant: string;
  activite: string;
  statut: PaymentStatusLabel;
  datePaiement: string | null;
};

export default function SuiviPaiements() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const userRole = getStoredUserRole() || 'admin';
  const canManage = userRole !== 'super_admin' && userRole !== 'comptable';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [showRecuPDF, setShowRecuPDF] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState<UiPaiementMarche | null>(null);
  const [transactionData, setTransactionData] = useState<ReceiptData | null>(null);
  const [paiements, setPaiements] = useState<UiPaiementMarche[]>([]);
  const [stats, setStats] = useState<MarcheStats>({ recettesMois: 0, placesOccupees: 0 });

  const loadData = async () => {
    try {
      const [payments, marketStats] = await Promise.all([listPaiementsMarche(selectedYear), getMarcheStats(selectedYear)]);
      const mapped = (payments || []).map((p: PaiementMarche): UiPaiementMarche => ({
        ...p,
        numero: p.place?.numero || '-',
        occupant: p.place?.occupant || p.place?.occupantId || 'N/A',
        activite: p.place?.activite || '-',
        statut:
          p.statut === 'PAYE' ? 'Payé' : p.statut === 'EN_ATTENTE' ? 'En attente' : 'En retard',
        datePaiement: p.datePaiement ? new Date(p.datePaiement).toLocaleDateString('fr-FR') : null,
      }));
      setPaiements(mapped);
      setStats(marketStats || {});
    } catch {
      setPaiements([]);
      setStats({ recettesMois: 0, placesOccupees: 0 });
      showToast("Impossible de charger les paiements du marché.", 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const filteredPaiements = paiements.filter((paiement) => {
    const matchSearch = paiement.occupant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       paiement.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'tous' || paiement.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const counters = useMemo(() => {
    const paid = paiements.filter((p) => p.statut === 'Payé').length;
    const pending = paiements.filter((p) => p.statut === 'En attente').length;
    const late = paiements.filter((p) => p.statut === 'En retard').length;
    return { paid, pending, late };
  }, [paiements]);

  const handlePayer = (paiement: UiPaiementMarche) => {
    setSelectedPaiement(paiement);
    setShowPaiementModal(true);
  };

  const handleImprimerRecu = (paiement: UiPaiementMarche) => {
    const now = new Date();
    const recuData = {
      numero: `MRC-${paiement.id.toString().padStart(5, '0')}`,
      date: paiement.datePaiement || now.toLocaleDateString('fr-FR'),
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      contribuable: paiement.occupant,
      type: `Place de marché ${paiement.numero} - ${paiement.periode}`,
      montant: paiement.montant,
      agent: 'Agent Municipal'
    };
    setTransactionData(recuData);
    setShowRecuPDF(true);
  };

  const handleSubmitPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaiement) return;
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }
    
    try {
      await createPaiementMarche({
        placeId: selectedPaiement.placeId,
        periode: selectedPaiement.periode,
        montant: Number(selectedPaiement.montant),
        reference: `MRC-${Date.now()}`,
      });
      const now = new Date();
      setTransactionData({
        numero: `MRC-${selectedPaiement.id.toString().padStart(5, '0')}`,
        date: now.toLocaleDateString('fr-FR'),
        heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        contribuable: selectedPaiement.occupant,
        type: `Place de marché ${selectedPaiement.numero} - ${selectedPaiement.periode}`,
        montant: selectedPaiement.montant,
        agent: 'Agent Municipal',
      });
      setShowPaiementModal(false);
      setSelectedPaiement(null);
      setShowSuccessMessage(true);
      await loadData();
      setTimeout(() => {
        setShowSuccessMessage(false);
        setShowRecuPDF(true);
      }, 1000);
    } catch (error) {
      showToast(getErrorMessage(error, "Impossible d'enregistrer le paiement."), 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Message de succès */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <i className="ri-checkbox-circle-line text-2xl"></i>
          <div>
            <p className="font-medium">Paiement enregistré avec succès !</p>
            <p className="text-xs text-emerald-100">Génération du reçu en cours...</p>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-emerald-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{Number(stats.recettesMois || 0).toLocaleString()} FCFA</p>
          <p className="text-sm text-gray-600">Recettes du mois</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-cyan-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{counters.paid}</p>
          <p className="text-sm text-gray-600">Paiements à jour</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <i className="ri-time-line text-yellow-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{counters.pending}</p>
          <p className="text-sm text-gray-600">En attente</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <i className="ri-alert-line text-red-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{counters.late}</p>
          <p className="text-sm text-gray-600">En retard</p>
        </div>
      </div>

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
                placeholder="Nom ou numéro de place..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="tous">Tous les statuts</option>
              <option value="Payé">Payé</option>
              <option value="En attente">En attente</option>
              <option value="En retard">En retard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des paiements */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Place</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Occupant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Activité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Période</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Date paiement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Statut</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPaiements.map((paiement) => (
                <tr key={paiement.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{paiement.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{paiement.occupant}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{paiement.activite}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{paiement.periode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-cyan-600 whitespace-nowrap">{paiement.montant.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{paiement.datePaiement || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                      paiement.statut === 'Payé' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : paiement.statut === 'En attente'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {paiement.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {canManage && paiement.statut !== 'Payé' && (
                        <button 
                          onClick={() => handlePayer(paiement)}
                          className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Enregistrer le paiement"
                        >
                          <i className="ri-money-dollar-circle-line"></i>
                        </button>
                      )}
                      <button 
                        className="w-8 h-8 flex items-center justify-center text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                        title="Voir détails"
                      >
                        <i className="ri-eye-line"></i>
                      </button>
                      {canManage && paiement.statut === 'Payé' && (
                        <button 
                          onClick={() => handleImprimerRecu(paiement)}
                          className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
      </div>

      {/* Modal Paiement */}
      {canManage && showPaiementModal && selectedPaiement && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="bg-cyan-500 text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">Enregistrer un paiement</h3>
              <p className="text-sm text-cyan-100 mt-1">Place {selectedPaiement.numero}</p>
            </div>

            <form onSubmit={handleSubmitPaiement} onInput={clearFieldValidationError} noValidate className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Occupant</span>
                  <span className="text-sm font-medium text-gray-900">{selectedPaiement.occupant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activité</span>
                  <span className="text-sm font-medium text-gray-900">{selectedPaiement.activite}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Période</span>
                  <span className="text-sm font-medium text-gray-900">{selectedPaiement.periode}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Montant à payer</span>
                  <span className="text-lg font-bold text-cyan-600">{selectedPaiement.montant.toLocaleString()} FCFA</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de paiement <span className="text-red-500">*</span>
                </label>
                <select
                  data-required="true"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">Sélectionnez</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Virement">Virement bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de paiement <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  data-required="true"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observations
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes ou informations complémentaires..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaiementModal(false);
                    setSelectedPaiement(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-check-line mr-2"></i>
                  Valider le paiement
                </button>
              </div>
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
