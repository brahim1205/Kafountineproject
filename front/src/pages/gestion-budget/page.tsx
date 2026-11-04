import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { useToast } from '../../components/feature/Toast';
import { useYear } from '../../contexts/YearContext';
import { getStoredUserRole } from '../../services/auth';
import {
  createLigneBudgetaire,
  deleteLigneBudgetaire,
  listLignesBudgetaires,
  updateLigneBudgetaire,
  type LigneBudgetaire,
  type LigneBudgetairePayload,
} from '../../services/budget';
import BudgetSummary from './components/BudgetSummary';
import BudgetTable from './components/BudgetTable';
import LigneDetailModal from './components/LigneDetailModal';
import LigneFormModal from './components/LigneFormModal';

type ModalState = { type: 'create' } | { type: 'edit' | 'view'; ligne: LigneBudgetaire } | null;

export default function GestionBudgetPage() {
  const { showToast } = useToast();
  const { selectedYear } = useYear();
  const [lignes, setLignes] = useState<LigneBudgetaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  // Même règle que l'API : seuls les admins suppriment une ligne budgétaire.
  const role = getStoredUserRole();
  const canDelete = role === 'admin' || role === 'super_admin';

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const data = await listLignesBudgetaires(selectedYear);
      setLignes(Array.isArray(data) ? data : []);
    } catch {
      setLignes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgetData();
  }, [selectedYear]);

  const totalPrevu = lignes.reduce((sum, ligne) => sum + ligne.prevu, 0);
  const totalDepenses = lignes.reduce((sum, ligne) => sum + ligne.depense, 0);

  /** Enregistre puis recharge ; en cas d'échec, notifie et relance l'erreur pour que la modale l'affiche. */
  const save = (action: () => Promise<unknown>, success: string, failure: string) => async () => {
    try {
      await action();
      await loadBudgetData();
      setModal(null);
      showToast(success, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : failure, 'error');
      throw error;
    }
  };

  const handleCreate = (payload: LigneBudgetairePayload) =>
    save(() => createLigneBudgetaire({ ...payload, year: selectedYear }), 'Ligne budgétaire créée avec succès.', 'Création impossible.')();

  const handleUpdate = (ligne: LigneBudgetaire) => (payload: LigneBudgetairePayload) =>
    save(() => updateLigneBudgetaire(ligne.id, payload), 'Ligne budgétaire mise à jour avec succès.', 'Mise à jour impossible.')();

  const handleDelete = async (ligne: LigneBudgetaire) => {
    if (!window.confirm(`Supprimer la ligne budgétaire "${ligne.code} - ${ligne.libelle}" ?`)) {
      return;
    }
    try {
      setDeleting(true);
      await deleteLigneBudgetaire(ligne.id);
      if (modal && modal.type !== 'create' && modal.ligne.id === ligne.id) {
        setModal(null);
      }
      await loadBudgetData();
      showToast('Ligne budgétaire supprimée avec succès.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Suppression impossible.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion du Budget</h1>
            <p className="text-sm text-gray-600 mt-1">Vue d'ensemble des lignes budgétaires - Année {selectedYear}</p>
          </div>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <i className="ri-add-line"></i>
            Nouvelle Ligne
          </button>
        </div>

        <BudgetSummary totalPrevu={totalPrevu} totalDepenses={totalDepenses} />

        <BudgetTable
          lignes={lignes}
          loading={loading}
          year={selectedYear}
          busy={deleting}
          onEdit={(ligne) => setModal({ type: 'edit', ligne })}
          onView={(ligne) => setModal({ type: 'view', ligne })}
          onDelete={canDelete ? handleDelete : undefined}
        />
      </div>

      {modal?.type === 'create' && <LigneFormModal onClose={() => setModal(null)} onSubmit={handleCreate} />}
      {modal?.type === 'edit' && <LigneFormModal ligne={modal.ligne} onClose={() => setModal(null)} onSubmit={handleUpdate(modal.ligne)} />}
      {modal?.type === 'view' && <LigneDetailModal ligne={modal.ligne} onClose={() => setModal(null)} />}
    </DashboardLayout>
  );
}
