import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { 
  getTarifs, createTarif, updateTarif, deleteTarif,
  getPenalites, createPenalite, updatePenalite, deletePenalite,
  getPermissions, updatePermission,
  listBackups, createBackup, downloadBackup, restoreBackup,
  seedSettings,
  type Tarif, type Penalite, type Permission, type BackupFile
} from '../../services/settings';
import {
  clearFieldValidationError,
  validateFormElement,
} from '../../utils/formValidation';

interface TarifConfig extends Tarif {
  modifiable: boolean;
}

export default function Parametres() {
  const [activeTab, setActiveTab] = useState('tarifs');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddTarifModal, setShowAddTarifModal] = useState(false);
  const [showAddPenaliteModal, setShowAddPenaliteModal] = useState(false);
  const [showEditPenaliteModal, setShowEditPenaliteModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTarif, setSelectedTarif] = useState<TarifConfig | null>(null);
  const [selectedPenalite, setSelectedPenalite] = useState<Penalite | null>(null);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  
  // Data from API
  const [tarifs, setTarifs] = useState<TarifConfig[]>([]);
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);

  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tarifsData, penalitesData, permissionsData, backupsData] = await Promise.all([
        getTarifs(),
        getPenalites(),
        getPermissions(),
        listBackups().catch(() => [])
      ]);
      setTarifs(tarifsData.map(t => ({ ...t, modifiable: true })));
      setPenalites(penalitesData);
      setPermissions(permissionsData);
      setBackups(backupsData);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de charger les paramètres.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTarif = (tarif: TarifConfig) => {
    setSelectedTarif(tarif);
    setShowEditModal(true);
  };

  const handleSaveTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }
    try {
      if (selectedTarif) {
        await updateTarif(selectedTarif.id, {
          nom: selectedTarif.nom,
          montant: selectedTarif.montant,
          unite: selectedTarif.unite,
          description: selectedTarif.description
        });
      }
      setShowEditModal(false);
      showSuccess('Tarif modifié avec succès !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de modifier le tarif.');
    }
  };

  const handleAddTarif = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const formData = new FormData(e.currentTarget);
    try {
      await createTarif({
        categorie: formData.get('categorie') as string,
        nom: formData.get('nom') as string,
        montant: Number(formData.get('montant')),
        unite: formData.get('unite') as string,
        description: formData.get('description') as string || undefined
      });
      setShowAddTarifModal(false);
      showSuccess('Tarif créé avec succès !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de créer le tarif.');
    }
  };

  const handleDeleteTarif = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) return;
    try {
      await deleteTarif(id);
      showSuccess('Tarif supprimé avec succès !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de supprimer le tarif.');
    }
  };

  const handleTogglePenalite = async (id: string, actuel: boolean) => {
    try {
      await updatePenalite(id, { actif: !actuel });
      showSuccess('Statut de la pénalité modifié !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de modifier la pénalité.');
    }
  };

  const handleEditPenalite = (penalite: Penalite) => {
    setSelectedPenalite(penalite);
    setShowEditPenaliteModal(true);
  };

  const handleSavePenalite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPenalite) return;
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }

    try {
      await updatePenalite(selectedPenalite.id, {
        type: selectedPenalite.type,
        montant: selectedPenalite.montant,
        delai: selectedPenalite.delai,
        description: selectedPenalite.description,
      });
      setShowEditPenaliteModal(false);
      setSelectedPenalite(null);
      showSuccess('Pénalité modifiée avec succès !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de modifier la pénalité.');
    }
  };

  const handleDeletePenalite = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette pénalité ?')) return;
    try {
      await deletePenalite(id);
      showSuccess('Pénalité supprimée avec succès !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de supprimer la pénalité.');
    }
  };

  const handleAddPenalite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const formData = new FormData(e.currentTarget);
    try {
      await createPenalite({
        type: formData.get('type') as string,
        description: formData.get('description') as string || undefined,
        montant: Number(formData.get('montant')),
        delai: formData.get('delai') as string
      });
      setShowAddPenaliteModal(false);
      showSuccess('Pénalité créée avec succès !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de créer la pénalité.');
    }
  };

  const handleSavePermissions = async () => {
    if (permissions.length === 0) {
      showError('Aucune permission chargée depuis le backend.');
      return;
    }
    try {
      for (const perm of permissions) {
        await updatePermission({ role: 'AGENT', module: perm.module, enabled: perm.agent });
        await updatePermission({ role: 'SUPERVISEUR', module: perm.module, enabled: perm.superviseur });
        await updatePermission({ role: 'COMPTABLE', module: perm.module, enabled: perm.comptable });
        await updatePermission({ role: 'ADMIN', module: perm.module, enabled: perm.admin });
        await updatePermission({ role: 'SUPER_ADMIN', module: perm.module, enabled: true });
      }
      showSuccess('Permissions enregistrées avec succès !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible d’enregistrer les permissions.');
    }
  };

  const handleTogglePermission = (moduleIndex: number, role: 'agent' | 'superviseur' | 'comptable' | 'admin') => {
    setPermissions(permissions.map((perm, index) => 
      index === moduleIndex ? { ...perm, [role]: !perm[role] } : perm
    ));
  };

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      await createBackup();
      setBackups(await listBackups());
      showSuccess('Sauvegarde créée avec succès.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'La sauvegarde a échoué.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(`Restaurer la sauvegarde ${filename} ? Cette opération remplacera la base courante.`)) return;
    try {
      setBackupLoading(true);
      await restoreBackup(filename);
      showSuccess(`Restauration terminée depuis ${filename}.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'La restauration a échoué.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      await downloadBackup(filename);
      showSuccess(`Téléchargement démarré pour ${filename}.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Le téléchargement a échoué.');
    }
  };

  const handleSeed = async () => {
    try {
      await seedSettings();
      showSuccess('Paramètres seeded avec succès !');
      loadData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de charger les données par défaut.');
    }
  };

  const showSuccess = (message: string) => {
    setErrorMessage('');
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const showError = (message: string) => {
    setSuccessMessage('');
    setShowSuccessMessage(false);
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const currentPermissions = permissions;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Message de succès */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-teal-200 p-4 flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
              <i className="ri-check-line text-teal-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{successMessage}</p>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="fixed top-4 left-4 z-50 bg-white rounded-lg shadow-lg border border-red-200 p-4 flex items-center gap-3 animate-fade-in max-w-md">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <i className="ri-error-warning-line text-red-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres système</h1>
            <p className="text-sm text-gray-600 mt-1">Configuration des tarifs, pénalités et permissions</p>
          </div>
          <button
            onClick={handleSeed}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <i className="ri-refresh-line"></i>
            Charger données par défaut
          </button>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('tarifs')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'tarifs'
                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-price-tag-3-line mr-2"></i>
                Tarifs
              </button>
              <button
                onClick={() => setActiveTab('penalites')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'penalites'
                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-alert-line mr-2"></i>
                Pénalités
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'permissions'
                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-shield-key-line mr-2"></i>
                Permissions
              </button>
              <button
                onClick={() => setActiveTab('sauvegarde')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'sauvegarde'
                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-database-2-line mr-2"></i>
                Sauvegarde
              </button>
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* TAB TARIFS */}
                {activeTab === 'tarifs' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Configuration dynamique des tarifs par catégorie</h2>
                      <button
                        onClick={() => setShowAddTarifModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        <i className="ri-add-line"></i>
                        Nouveau tarif
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Catégorie</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nom du tarif</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Montant</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Unité</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {tarifs.map((tarif) => (
                            <tr key={tarif.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{tarif.categorie}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{tarif.nom}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{tarif.montant.toLocaleString()} {tarif.unite}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{tarif.unite}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleEditTarif(tarif)}
                                  className="text-teal-600 hover:text-teal-700 mr-3"
                                >
                                  <i className="ri-edit-line"></i>
                                </button>
                                <button
                                  onClick={() => handleDeleteTarif(tarif.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {tarifs.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                Aucun tarif configuré. Cliquez sur "Charger données par défaut" pour initialiser.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB PENALITES */}
                {activeTab === 'penalites' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Gestion des pénalités et calculs automatiques</h2>
                      <button
                        onClick={() => setShowAddPenaliteModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        <i className="ri-add-line"></i>
                        Nouvelle pénalité
                      </button>
                    </div>
                    <div className="space-y-4">
                      {penalites.map((penalite) => (
                        <div key={penalite.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-gray-900">{penalite.type}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${penalite.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {penalite.actif ? 'Actif' : 'Inactif'}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Montant: </span>
                                <span className="font-medium text-gray-900">{penalite.montant.toLocaleString()} FCFA</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Délai d'application: </span>
                                <span className="font-medium text-gray-900">{penalite.delai}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleTogglePenalite(penalite.id, penalite.actif)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              penalite.actif ? 'bg-teal-600' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              penalite.actif ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                          <div className="ml-4 flex items-center gap-3">
                            <button
                              onClick={() => handleEditPenalite(penalite)}
                              className="text-teal-600 hover:text-teal-700"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            <button
                              onClick={() => handleDeletePenalite(penalite.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                      {penalites.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          Aucune pénalité configurée. Cliquez sur "Charger données par défaut" pour initialiser.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB PERMISSIONS */}
                {activeTab === 'permissions' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Gestion des permissions granulaires par rôle et module</h2>
                      <button
                        onClick={handleSavePermissions}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        <i className="ri-save-line"></i>
                        Enregistrer les permissions
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Module</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Agent</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Superviseur</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Comptable</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Administrateur</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {currentPermissions.map((perm, index) => (
                            <tr key={perm.module} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{perm.module}</td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.agent}
                                  onChange={() => handleTogglePermission(index, 'agent')}
                                  className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.superviseur}
                                  onChange={() => handleTogglePermission(index, 'superviseur')}
                                  className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.comptable}
                                  onChange={() => handleTogglePermission(index, 'comptable')}
                                  className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.admin}
                                  onChange={() => handleTogglePermission(index, 'admin')}
                                  className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                />
                              </td>
                            </tr>
                          ))}
                          {currentPermissions.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                Impossible de charger les permissions depuis le backend.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB SAUVEGARDE */}
                {activeTab === 'sauvegarde' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration des sauvegardes automatiques et restauration</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-4">Sauvegarde automatique</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                              <option>Quotidienne (recommandé)</option>
                              <option>Hebdomadaire</option>
                              <option>Mensuelle</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heure de sauvegarde</label>
                            <input type="time" defaultValue="02:00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="autoBackup" defaultChecked className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500" />
                            <label htmlFor="autoBackup" className="text-sm text-gray-700">Activer les sauvegardes automatiques</label>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-4">Actions</h3>
                        <div className="space-y-3">
                          <button
                            onClick={handleCreateBackup}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
                            disabled={backupLoading}
                          >
                            <i className="ri-save-3-line"></i>
                            {backupLoading ? 'Traitement...' : 'Créer une sauvegarde maintenant'}
                          </button>
                          <button
                            onClick={() => backups[0] && handleDownloadBackup(backups[0].filename)}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            disabled={!backups[0]}
                          >
                            <i className="ri-download-line"></i>
                            Télécharger la dernière sauvegarde
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="font-medium text-gray-900 mb-4">Sauvegardes récentes</h3>
                      <div className="space-y-2">
                        {backups.map((backup) => (
                          <div key={backup.filename} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              <i className="ri-database-line text-gray-600"></i>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{new Date(backup.createdAt).toLocaleString('fr-FR')}</p>
                                <p className="text-xs text-gray-500">{(backup.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Disponible</span>
                              <button
                                onClick={() => handleDownloadBackup(backup.filename)}
                                className="text-sm text-gray-600 hover:text-teal-700"
                              >
                                Télécharger
                              </button>
                              <button
                                onClick={() => handleRestoreBackup(backup.filename)}
                                className="text-sm text-teal-600 hover:text-teal-700"
                                disabled={backupLoading}
                              >
                                Restaurer
                              </button>
                            </div>
                          </div>
                        ))}
                        {backups.length === 0 && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
                            Aucune sauvegarde disponible pour le moment.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal Ajout Tarif */}
        {showAddTarifModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouveau tarif</h3>
              <form onSubmit={handleAddTarif} onInput={clearFieldValidationError} noValidate>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <select name="categorie" data-required="true" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                      <option value="État Civil">État Civil</option>
                      <option value="Urbanisme">Urbanisme</option>
                      <option value="Marché">Marché</option>
                      <option value="Transport">Transport</option>
                      <option value="Manifestations">Manifestations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du tarif</label>
                    <input name="nom" type="text" data-required="true" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                    <input name="montant" type="number" data-required="true" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                    <select name="unite" data-required="true" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                      <option value="FCFA">FCFA</option>
                      <option value="FCFA/mois">FCFA/mois</option>
                      <option value="FCFA/an">FCFA/an</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" rows={2}></textarea>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowAddTarifModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Créer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Ajout Pénalité */}
        {showAddPenaliteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouvelle pénalité</h3>
              <form onSubmit={handleAddPenalite} onInput={clearFieldValidationError} noValidate>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <input name="type" type="text" data-required="true" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                    <input name="montant" type="number" data-required="true" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Délai d'application</label>
                    <input name="delai" type="text" data-required="true" placeholder="Ex: 5 jours après échéance" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" rows={2}></textarea>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowAddPenaliteModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Créer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Édition Tarif */}
        {showEditModal && selectedTarif && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Modifier le tarif</h3>
              <form onSubmit={handleSaveTarif} onInput={clearFieldValidationError} noValidate>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du tarif</label>
                    <input 
                      type="text" 
                      value={selectedTarif.nom}
                      onChange={(e) => setSelectedTarif({...selectedTarif, nom: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                    <input 
                      type="number" 
                      value={selectedTarif.montant}
                      onChange={(e) => setSelectedTarif({...selectedTarif, montant: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                    <select 
                      value={selectedTarif.unite}
                      onChange={(e) => setSelectedTarif({...selectedTarif, unite: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="FCFA">FCFA</option>
                      <option value="FCFA/mois">FCFA/mois</option>
                      <option value="FCFA/an">FCFA/an</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Édition Pénalité */}
        {showEditPenaliteModal && selectedPenalite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Modifier la pénalité</h3>
              <form onSubmit={handleSavePenalite} onInput={clearFieldValidationError} noValidate>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <input
                      type="text"
                      value={selectedPenalite.type}
                      onChange={(e) => setSelectedPenalite({ ...selectedPenalite, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                    <input
                      type="number"
                      value={selectedPenalite.montant}
                      onChange={(e) => setSelectedPenalite({ ...selectedPenalite, montant: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Délai d'application</label>
                    <input
                      type="text"
                      value={selectedPenalite.delai}
                      onChange={(e) => setSelectedPenalite({ ...selectedPenalite, delai: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={selectedPenalite.description || ''}
                      onChange={(e) => setSelectedPenalite({ ...selectedPenalite, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowEditPenaliteModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
