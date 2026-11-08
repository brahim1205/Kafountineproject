import { useEffect, useRef, useState } from 'react';
import { canWriteData } from '../../services/auth';
import DashboardLayout from '../../components/feature/DashboardLayout';
import {
  deletePenalite,
  deleteTarif,
  getPenalites,
  getTarifs,
  listBackups,
  updatePenalite,
  type BackupFile,
  type Penalite,
  type Tarif,
} from '../../services/settings';
import TarifsTab from './components/TarifsTab';
import PenalitesTab from './components/PenalitesTab';
import SauvegardeTab from './components/SauvegardeTab';
import TarifModal from './components/TarifModal';
import PenaliteModal from './components/PenaliteModal';

type Tab = 'tarifs' | 'penalites' | 'sauvegarde';
type ModalState =
  | { type: 'tarif'; tarif?: Tarif }
  | { type: 'penalite'; penalite?: Penalite }
  | null;

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'tarifs', label: 'Tarifs', icon: 'ri-price-tag-3-line' },
  { id: 'penalites', label: 'Pénalités', icon: 'ri-alert-line' },
  { id: 'sauvegarde', label: 'Sauvegarde', icon: 'ri-database-2-line' },
];

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export default function Parametres() {
  // Administrateur : consultation des paramètres, sans modification (même règle que l'API).
  const readOnly = !canWriteData();
  const [activeTab, setActiveTab] = useState<Tab>('tarifs');
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [loading, setLoading] = useState(false);

  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const categories = Array.from(new Set(tarifs.map((tarif) => tarif.categorie))).sort((a, b) => a.localeCompare(b, 'fr'));

  const notify = (kind: 'success' | 'error', message: string) => {
    clearTimeout(noticeTimer.current);
    setNotice({ kind, message });
    noticeTimer.current = setTimeout(() => setNotice(null), kind === 'success' ? 3000 : 4000);
  };
  const showError = (message: string) => notify('error', message);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tarifsData, penalitesData, backupsData] = await Promise.all([
        getTarifs(),
        getPenalites(),
        listBackups().catch(() => []),
      ]);
      setTarifs(tarifsData);
      setPenalites(penalitesData);
      setBackups(backupsData);
    } catch (error) {
      showError(errorMessage(error, 'Impossible de charger les paramètres.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => clearTimeout(noticeTimer.current);
  }, []);

  /** Affiche le message puis recharge les données ; ferme la modale éventuelle. */
  const afterChange = (message: string) => {
    setModal(null);
    notify('success', message);
    loadData();
  };

  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    try {
      await action();
      afterChange(success);
    } catch (error) {
      showError(errorMessage(error, failure));
    }
  };

  const supprimerTarif = (tarif: Tarif) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) return;
    run(() => deleteTarif(tarif.id), 'Tarif supprimé avec succès !', 'Impossible de supprimer le tarif.');
  };

  const supprimerPenalite = (penalite: Penalite) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette pénalité ?')) return;
    run(() => deletePenalite(penalite.id), 'Pénalité supprimée avec succès !', 'Impossible de supprimer la pénalité.');
  };

  const basculerPenalite = (penalite: Penalite) =>
    run(() => updatePenalite(penalite.id, { actif: !penalite.actif }), 'Statut de la pénalité modifié !', 'Impossible de modifier la pénalité.');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`fixed top-4 z-50 bg-white rounded-lg shadow-lg border p-4 flex items-center gap-3 animate-fade-in max-w-md ${
              notice.kind === 'success' ? 'right-4 border-emerald-200' : 'left-4 border-red-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notice.kind === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <i className={`text-xl ${notice.kind === 'success' ? 'ri-check-line text-emerald-600' : 'ri-error-warning-line text-red-600'}`}></i>
            </div>
            <p className="text-sm font-medium text-gray-900">{notice.message}</p>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres système</h1>
          <p className="text-sm text-gray-600 mt-1">Configuration des tarifs, pénalités et sauvegardes</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {activeTab === 'tarifs' && (
                  <TarifsTab
                    tarifs={tarifs}
                    onAdd={() => setModal({ type: 'tarif' })}
                    onEdit={(tarif) => setModal({ type: 'tarif', tarif })}
                    onDelete={supprimerTarif}
                    readOnly={readOnly}
                  />
                )}
                {activeTab === 'penalites' && (
                  <PenalitesTab
                    penalites={penalites}
                    onAdd={() => setModal({ type: 'penalite' })}
                    onEdit={(penalite) => setModal({ type: 'penalite', penalite })}
                    onToggle={basculerPenalite}
                    onDelete={supprimerPenalite}
                    readOnly={readOnly}
                  />
                )}
                {activeTab === 'sauvegarde' && <SauvegardeTab backups={backups} onChanged={afterChange} onError={showError} readOnly={readOnly} />}
              </>
            )}
          </div>
        </div>

        {modal?.type === 'tarif' && (
          <TarifModal
            tarif={modal.tarif}
            categories={categories}
            onClose={() => setModal(null)}
            onSaved={afterChange}
            onError={showError}
          />
        )}
        {modal?.type === 'penalite' && (
          <PenaliteModal penalite={modal.penalite} onClose={() => setModal(null)} onSaved={afterChange} onError={showError} />
        )}
      </div>
    </DashboardLayout>
  );
}
