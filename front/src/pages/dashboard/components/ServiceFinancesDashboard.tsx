import { useState, useEffect } from 'react';
import { useYear } from '../../../contexts/YearContext';
import { useToast } from '../../../components/feature/Toast';
import { apiRequest } from '../../../services/api';
import { getStoredUserName, getStoredUserRole, canWriteData } from '../../../services/auth';
import {
  clearFieldValidationError,
  validateFormElement,
} from '../../../utils/formValidation';

type LigneBudgetaire = {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense: number;
  year: number;
};

type DemandeDepense = {
  id: string;
  service: string;
  description: string;
  montant: number;
  statut: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';
  motif: string | null;
  createdAt: string;
};

type BudgetStats = {
  totalPrevu: number;
  totalDepense: number;
  totalReste: number;
  tauxExecution: number;
  nombreLignes: number;
  demandesEnAttente: number;
  demandesApprouvees: number;
  demandesRejetees: number;
};

export default function ServiceFinancesDashboard() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userRole = getStoredUserRole() || 'service_finances';
  const userName = getStoredUserName() || 'Service des Finances';
  // Même règle que l'API (PUT /budget/demandes/:id) : séparation des tâches, le super admin tranche les demandes.
  const canDecide = userRole === 'super_admin';
  // L'administrateur consulte le budget et les demandes sans rien modifier.
  const canWrite = canWriteData(userRole);
  const showsDecisions = canDecide || userRole === 'admin';
  const [showModalBudget, setShowModalBudget] = useState(false);
  const [showModalDepense, setShowModalDepense] = useState(false);
  // Les admins viennent ici pour trancher les demandes : on ouvre directement cet onglet.
  const [activeTab, setActiveTab] = useState<'budget' | 'depenses'>(showsDecisions ? 'depenses' : 'budget');
  const [newLigneBudget, setNewLigneBudget] = useState({ code: '', libelle: '', prevu: 0 });
  const [newDepense, setNewDepense] = useState({ service: '', description: '', montant: 0 });
  const [budgetPrevisionnel, setBudgetPrevisionnel] = useState<LigneBudgetaire[]>([]);
  const [demandesDepenses, setDemandesDepenses] = useState<DemandeDepense[]>([]);
  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadBudgetData();
  }, [selectedYear]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [lignes, demandes, statsData] = await Promise.all([
        apiRequest<LigneBudgetaire[]>(`/budget/lignes?year=${selectedYear}`),
        apiRequest<DemandeDepense[]>(`/budget/demandes?year=${selectedYear}`),
        apiRequest<BudgetStats>(`/budget/stats?year=${selectedYear}`),
      ]);
      setBudgetPrevisionnel(Array.isArray(lignes) ? lignes : []);
      setDemandesDepenses(Array.isArray(demandes) ? demandes : []);
      setStats(statsData || null);
    } catch {
      setBudgetPrevisionnel([]);
      setDemandesDepenses([]);
      setStats(null);
      setErrorMsg("Impossible de charger les données budgétaires.");
    } finally {
      setLoading(false);
    }
  };

  const totalPrevu = stats?.totalPrevu ?? budgetPrevisionnel.reduce((s, b) => s + b.prevu, 0);
  const totalDepense = stats?.totalDepense ?? budgetPrevisionnel.reduce((s, b) => s + b.depense, 0);
  const totalReste = stats?.totalReste ?? (totalPrevu - totalDepense);
  const tauxExecution = stats?.tauxExecution ?? (totalPrevu > 0 ? Math.round((totalDepense / totalPrevu) * 100) : 0);

  const handleApprouver = async (id: string) => {
    try {
      await apiRequest(`/budget/demandes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: 'APPROUVE' }),
      });
      setDemandesDepenses(demandesDepenses.map(d => 
        d.id === id ? { ...d, statut: 'APPROUVE' as const } : d
      ));
      showToast('Demande approuvée.', 'success');
    } catch {
      showToast('Erreur lors de l\'approbation de la demande', 'error');
    }
  };

  const handleRejeter = async (id: string) => {
    try {
      await apiRequest(`/budget/demandes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: 'REJETE' }),
      });
      setDemandesDepenses(demandesDepenses.map(d => 
        d.id === id ? { ...d, statut: 'REJETE' as const } : d
      ));
      showToast('Demande rejetée.', 'warning');
    } catch {
      showToast('Erreur lors du rejet de la demande', 'error');
    }
  };

  const handleAddLigneBudgetaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }
    try {
      await apiRequest<LigneBudgetaire>('/budget/lignes', {
        method: 'POST',
        body: JSON.stringify({
          code: newLigneBudget.code,
          libelle: newLigneBudget.libelle,
          prevu: newLigneBudget.prevu,
          year: selectedYear,
        }),
      });
      showToast('Ligne budgétaire ajoutée avec succès!', 'success');
      loadBudgetData();
      setShowModalBudget(false);
      setNewLigneBudget({ code: '', libelle: '', prevu: 0 });
    } catch {
      showToast('Erreur lors de l\'ajout de la ligne budgétaire', 'error');
    }
  };

  const handleAddDepense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }
    try {
      await apiRequest<DemandeDepense>('/budget/demandes', {
        method: 'POST',
        body: JSON.stringify({
          service: newDepense.service,
          description: newDepense.description,
          montant: newDepense.montant,
          year: selectedYear,
        }),
      });
      showToast('Demande de dépense soumise avec succès!', 'success');
      loadBudgetData();
      setShowModalDepense(false);
      setNewDepense({ service: '', description: '', montant: 0 });
    } catch {
      showToast('Erreur lors de la soumission de la demande', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showsDecisions ? 'Budget et demandes de dépense' : `Bonjour, ${userName.split(' ')[0]} — Service des Finances 👋`}
          </h1>
          <p className="text-sm text-gray-600 mt-1">Gestion du budget et des dépenses</p>
        </div>
        {/* Badge année passée - lecture seule */}
        {!isCurrentYear && (
          <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg flex items-center gap-2">
            <i className="ri-eye-line"></i>
            <span className="text-sm font-medium">Année {selectedYear} - Consultation seule</span>
          </div>
        )}
        {isCurrentYear && canWrite && (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowModalBudget(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <i className="ri-add-line"></i>
            Nouvelle Ligne
          </button>
          <button 
            onClick={() => setShowModalDepense(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            <i className="ri-file-add-line"></i>
            Demande Dépense
          </button>
        </div>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'budget' 
              ? 'bg-teal-100 text-teal-700 border-b-2 border-teal-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <i className="ri-wallet-3-line mr-1"></i>
          Budget Prévisionnel
        </button>
        <button
          onClick={() => setActiveTab('depenses')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'depenses' 
              ? 'bg-teal-100 text-teal-700 border-b-2 border-teal-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <i className="ri-file-list-3-line mr-1"></i>
          Demandes Dépenses
        </button>
      </div>

      {/* Résumé budgétaire */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <i className="ri-wallet-3-line text-2xl"></i>
          </div>
          <p className="text-sm text-teal-100 mb-1">Budget Prévisionnel</p>
          <h3 className="text-2xl font-bold">{totalPrevu.toLocaleString()} FCFA</h3>
          <p className="text-xs text-teal-200 mt-1">Annuel</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <i className="ri-money-dollar-circle-line text-2xl"></i>
          </div>
          <p className="text-sm text-amber-100 mb-1">Total Dépensé</p>
          <h3 className="text-2xl font-bold">{totalDepense.toLocaleString()} FCFA</h3>
          <p className="text-xs text-amber-200 mt-1">Exécuté</p>
        </div>
        <div className={`bg-gradient-to-br ${totalReste >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} rounded-xl p-5 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <i className="ri-money-dollar-box-line text-2xl"></i>
          </div>
          <p className="text-sm text-emerald-100 mb-1">Reste à Disposer</p>
          <h3 className="text-2xl font-bold">{totalReste.toLocaleString()} FCFA</h3>
          <p className="text-xs text-emerald-200 mt-1">{totalReste >= 0 ? 'Disponible' : 'Dépassement'}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <i className="ri-pie-chart-line text-2xl"></i>
          </div>
          <p className="text-sm text-blue-100 mb-1">Taux d'Exécution</p>
          <h3 className="text-2xl font-bold">{tauxExecution}%</h3>
          <p className="text-xs text-blue-200 mt-1">Du budget</p>
        </div>
      </div>

      {/* Contenu selon l'onglet */}
      {activeTab === 'budget' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lignes Budgétaires</h3>
            <p className="text-sm text-gray-600 mt-1">Répartition du budget par poste</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ligne</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Prévu</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Dépensé</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Reste</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Réalisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Chargement des données...
                    </td>
                  </tr>
                ) : budgetPrevisionnel.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Aucune ligne budgétaire pour l'année {selectedYear}
                    </td>
                  </tr>
                ) : (
                  budgetPrevisionnel.map((item) => {
                    const reste = item.prevu - item.depense;
                    const realise = item.prevu > 0 ? Math.round((item.depense / item.prevu) * 100) : 0;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.code}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.libelle}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.prevu.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.depense.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${reste >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {reste.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                              <div 
                                className={`h-2 rounded-full ${realise > 100 ? 'bg-red-500' : realise > 90 ? 'bg-amber-500' : 'bg-teal-500'}`}
                                style={{ width: `${Math.min(realise, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 w-10">{realise}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'depenses' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Demandes de Dépenses</h3>
            <p className="text-sm text-gray-600 mt-1">En attente de traitement</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Montant</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Statut</th>
                  {canDecide && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={canDecide ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                      Chargement des données...
                    </td>
                  </tr>
                ) : demandesDepenses.length === 0 ? (
                  <tr>
                    <td colSpan={canDecide ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                      Aucune demande de dépense pour l'année {selectedYear}
                    </td>
                  </tr>
                ) : (
                  demandesDepenses.map((demande) => (
                    <tr key={demande.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{`DEP-${demande.id.slice(0, 8).toUpperCase()}`}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{demande.service}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{demande.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{demande.montant.toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{new Date(demande.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          demande.statut === 'APPROUVE' 
                            ? 'bg-green-100 text-green-700' 
                            : demande.statut === 'REJETE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {demande.statut === 'APPROUVE' ? 'Approuvé' : demande.statut === 'REJETE' ? 'Rejeté' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {canDecide && demande.statut === 'EN_ATTENTE' && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprouver(demande.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approuver"
                              aria-label="Approuver"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button
                              onClick={() => handleRejeter(demande.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Rejeter"
                              aria-label="Rejeter"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Ligne Budgétaire */}
      {showModalBudget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Ligne Budgétaire</h3>
                <button 
                  onClick={() => setShowModalBudget(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handleAddLigneBudgetaire} onInput={clearFieldValidationError} noValidate className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code budgétaire</label>
                  <input
                    type="text"
                    data-required="true"
                    value={newLigneBudget.code}
                    onChange={(e) => setNewLigneBudget({ ...newLigneBudget, code: e.target.value })}
                    placeholder="Ex: 601"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Libellé</label>
                  <input
                    type="text"
                    data-required="true"
                    value={newLigneBudget.libelle}
                    onChange={(e) => setNewLigneBudget({ ...newLigneBudget, libelle: e.target.value })}
                    placeholder="Ex: Salaires & Indemnités"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant prévu (FCFA)</label>
                  <input
                    type="number"
                    data-required="true"
                    min="0"
                    value={newLigneBudget.prevu || ''}
                    onChange={(e) => setNewLigneBudget({ ...newLigneBudget, prevu: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 5000000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModalBudget(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Demande Dépense */}
      {showModalDepense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Demande de Dépense</h3>
                <button 
                  onClick={() => setShowModalDepense(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handleAddDepense} onInput={clearFieldValidationError} noValidate className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service demandeur</label>
                  <select
                    data-required="true"
                    value={newDepense.service}
                    onChange={(e) => setNewDepense({ ...newDepense, service: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">Sélectionner un service</option>
                    <option value="Urbanisme">Urbanisme</option>
                    <option value="État Civil">État Civil</option>
                    <option value="Motos">Motos</option>
                    <option value="Marché">Marché</option>
                    <option value="Formations">Formations</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description de la dépense</label>
                  <textarea
                    data-required="true"
                    rows={3}
                    value={newDepense.description}
                    onChange={(e) => setNewDepense({ ...newDepense, description: e.target.value })}
                    placeholder="Décrire la dépense..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FCFA)</label>
                  <input
                    type="number"
                    data-required="true"
                    min="0"
                    value={newDepense.montant || ''}
                    onChange={(e) => setNewDepense({ ...newDepense, montant: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 150000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModalDepense(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                  >
                    Soumettre la demande
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
