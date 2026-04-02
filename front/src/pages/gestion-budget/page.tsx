import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { useToast } from '../../components/feature/Toast';
import { apiRequest } from '../../services/api';
import { useYear } from '../../contexts/YearContext';

type LigneBudgetaire = {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense: number;
  year: number;
};

type BudgetFormData = {
  code: string;
  libelle: string;
  description: string;
  prevu: string;
  depense: string;
};

const EMPTY_FORM: BudgetFormData = {
  code: '',
  libelle: '',
  description: '',
  prevu: '',
  depense: '',
};

export default function GestionBudgetPage() {
  const { showToast } = useToast();
  const { selectedYear } = useYear();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LigneBudgetaire | null>(null);
  const [categoriesBudget, setCategoriesBudget] = useState<LigneBudgetaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState<BudgetFormData>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<BudgetFormData>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadBudgetData();
  }, [selectedYear]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const lignes = await apiRequest<LigneBudgetaire[]>(`/budget/lignes?year=${selectedYear}`);
      setCategoriesBudget(Array.isArray(lignes) ? lignes : []);
    } catch {
      setCategoriesBudget([]);
      setLoadError("Impossible de charger les lignes budgétaires.");
    } finally {
      setLoading(false);
    }
  };

  const totalPrevu = categoriesBudget.reduce((s, c) => s + c.prevu, 0);
  const totalDepenses = categoriesBudget.reduce((s, c) => s + c.depense, 0);
  const totalReste = totalPrevu - totalDepenses;

  const closeCreateModal = () => {
    setShowModal(false);
    setCreateForm(EMPTY_FORM);
    setCreateError(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCategory(null);
    setEditForm(EMPTY_FORM);
    setEditError(null);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedCategory(null);
  };

  const handleCreateLine = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setCreateError(null);

    if (!createForm.code.trim() || !createForm.libelle.trim() || !createForm.prevu.trim()) {
      setCreateError('Le code, le libellé et le montant budgétisé sont requis.');
      return;
    }

    if (Number(createForm.prevu) < 0) {
      setCreateError('Le montant budgétisé doit être positif.');
      return;
    }

    try {
      setSaving(true);
      await apiRequest<LigneBudgetaire>('/budget/lignes', {
        method: 'POST',
        body: JSON.stringify({
          code: createForm.code.trim(),
          libelle: createForm.libelle.trim(),
          description: createForm.description.trim() || null,
          prevu: Number(createForm.prevu),
          year: selectedYear,
        }),
      });
      await loadBudgetData();
      closeCreateModal();
      showToast('Ligne budgétaire créée avec succès.', 'success');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Création impossible.');
      showToast(error instanceof Error ? error.message : 'Création impossible.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLine = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedCategory) {
      return;
    }

    setEditError(null);

    if (!editForm.code.trim() || !editForm.libelle.trim() || !editForm.prevu.trim()) {
      setEditError('Le code, le libellé et le montant budgétisé sont requis.');
      return;
    }

    if (Number(editForm.prevu) < 0 || Number(editForm.depense || '0') < 0) {
      setEditError('Les montants doivent être positifs.');
      return;
    }

    try {
      setSaving(true);
      await apiRequest<LigneBudgetaire>(`/budget/lignes/${selectedCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          code: editForm.code.trim(),
          libelle: editForm.libelle.trim(),
          description: editForm.description.trim() || null,
          prevu: Number(editForm.prevu),
          depense: Number(editForm.depense || '0'),
        }),
      });
      await loadBudgetData();
      closeEditModal();
      showToast('Ligne budgétaire mise à jour avec succès.', 'success');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Mise à jour impossible.');
      showToast(error instanceof Error ? error.message : 'Mise à jour impossible.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (ligne: LigneBudgetaire) => {
    const confirmed = window.confirm(`Supprimer la ligne budgétaire "${ligne.code} - ${ligne.libelle}" ?`);
    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      await apiRequest<{ message: string }>(`/budget/lignes/${ligne.id}`, {
        method: 'DELETE',
      });
      if (selectedCategory?.id === ligne.id) {
        closeEditModal();
        closeViewModal();
      }
      await loadBudgetData();
      showToast('Ligne budgétaire supprimée avec succès.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Suppression impossible.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion du Budget</h1>
            <p className="text-sm text-gray-600 mt-1">Vue d'ensemble des lignes budgétaires - Année {selectedYear}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setCreateForm(EMPTY_FORM);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <i className="ri-add-line"></i>
              Nouvelle Ligne
            </button>
          </div>
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Budget Total</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{totalPrevu.toLocaleString()} FCA</h3>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-xl text-teal-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Dépensé</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{totalDepenses.toLocaleString()} FCA</h3>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <i className="ri-money-dollar-line text-xl text-amber-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reste à Disposer</p>
                <h3 className={`text-xl font-bold mt-1 ${totalReste >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalReste.toLocaleString()} FCA
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${totalReste >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <i className={`ri-wallet-3-line text-xl ${totalReste >= 0 ? 'text-green-600' : 'text-red-600'}`}></i>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des lignes budgétaires */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Lignes Budgétaires</h2>
            <p className="text-sm text-gray-600 mt-1">Gestion des catégories de budget</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Catégorie</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Budgétisé</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Dépensé</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Reste</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Réalisation</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Chargement des données...
                    </td>
                  </tr>
                ) : categoriesBudget.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Aucune ligne budgétaire disponible pour l'année {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  categoriesBudget.map((categorie) => {
                    const reste = categorie.prevu - categorie.depense;
                    const realise = categorie.prevu > 0 ? Math.round((categorie.depense / categorie.prevu) * 100) : 0;
                    return (
                      <tr key={categorie.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">{categorie.code}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{categorie.libelle}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">{categorie.prevu.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">{categorie.depense.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-sm text-right font-medium ${reste >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {reste.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${realise > 100 ? 'bg-red-500' : 'bg-teal-500'}`}
                                style={{ width: `${Math.min(realise, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-medium ${realise > 100 ? 'text-red-600' : 'text-gray-600'}`}>
                              {realise}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                              title="Modifier"
                              onClick={() => {
                                setSelectedCategory(categorie);
                                setEditForm({
                                  code: categorie.code,
                                  libelle: categorie.libelle,
                                  description: categorie.description || '',
                                  prevu: String(categorie.prevu),
                                  depense: String(categorie.depense),
                                });
                                setShowEditModal(true);
                              }}
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            <button 
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Voir les détails"
                              onClick={() => {
                                setSelectedCategory(categorie);
                                setShowViewModal(true);
                              }}
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            <button
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                              title="Supprimer"
                              disabled={saving}
                              onClick={() => handleDeleteLine(categorie)}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
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

        {/* Modal pour nouvelle ligne budgétaire */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Nouvelle Ligne Budgétaire</h3>
                  <button 
                    onClick={closeCreateModal}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <form onSubmit={handleCreateLine} className="p-6 space-y-4">
                {createError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {createError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code budgétaire</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 609"
                    value={createForm.code}
                    onChange={(e) => setCreateForm((current) => ({ ...current, code: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la catégorie</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Formation professionnelle"
                    value={createForm.libelle}
                    onChange={(e) => setCreateForm((current) => ({ ...current, libelle: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant budgétisé (FCA)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 1000000"
                    min="0"
                    value={createForm.prevu}
                    onChange={(e) => setCreateForm((current) => ({ ...current, prevu: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Description de la catégorie budgétaire..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm((current) => ({ ...current, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  />
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3 -mx-6 -mb-6 mt-6">
                  <button 
                    type="button"
                    onClick={closeCreateModal}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Création...' : 'Créer la ligne'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal pour modifier une ligne budgétaire */}
        {showEditModal && selectedCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Modifier la Ligne Budgétaire</h3>
                  <button 
                    onClick={closeEditModal}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <form onSubmit={handleEditLine} className="p-6 space-y-4">
                {editError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {editError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code budgétaire</label>
                  <input 
                    type="text" 
                    value={editForm.code}
                    onChange={(e) => setEditForm((current) => ({ ...current, code: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la catégorie</label>
                  <input 
                    type="text" 
                    value={editForm.libelle}
                    onChange={(e) => setEditForm((current) => ({ ...current, libelle: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant budgétisé (FCA)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={editForm.prevu}
                    onChange={(e) => setEditForm((current) => ({ ...current, prevu: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dépensé (FCA)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.depense}
                    onChange={(e) => setEditForm((current) => ({ ...current, depense: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  />
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3 -mx-6 -mb-6 mt-6">
                  <button 
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal pour voir les détails */}
        {showViewModal && selectedCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Détails de la Ligne Budgétaire</h3>
                  <button 
                    onClick={closeViewModal}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Code</p>
                    <p className="font-medium text-gray-900">{selectedCategory.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Catégorie</p>
                    <p className="font-medium text-gray-900">{selectedCategory.libelle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Budgétisé</p>
                    <p className="font-medium text-gray-900">{selectedCategory.prevu.toLocaleString()} FCA</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dépensé</p>
                    <p className="font-medium text-gray-900">{selectedCategory.depense.toLocaleString()} FCA</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reste</p>
                    <p className={`font-medium ${selectedCategory.prevu - selectedCategory.depense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(selectedCategory.prevu - selectedCategory.depense).toLocaleString()} FCA
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Réalisation</p>
                    <p className={`font-medium ${selectedCategory.prevu > 0 && Math.round((selectedCategory.depense / selectedCategory.prevu) * 100) > 100 ? 'text-red-600' : 'text-teal-600'}`}>
                      {selectedCategory.prevu > 0 ? Math.round((selectedCategory.depense / selectedCategory.prevu) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button 
                  onClick={closeViewModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
