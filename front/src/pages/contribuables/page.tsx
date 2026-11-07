import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import {
  createContribuable,
  deleteContribuable,
  searchContribuablesPage,
  updateContribuable,
  validateContribuableDuplicates,
  type Contribuable,
} from '../../services/contribuables';
import { getStoredUserRole } from '../../services/auth';
import { useYear } from '../../contexts/YearContext';
import { useToast } from '../../components/feature/Toast';
import {
  clearFieldValidationError,
  getErrorMessage,
  validateFormElement,
} from '../../utils/formValidation';

const PAGE_SIZE = 20;

type UiContribuable = {
  id: string;
  name: string;
  activityType: string;
  zone: string;
  phone: string;
  status: string;
  nin: string;
  email?: string;
};

export default function Contribuables() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userRole = getStoredUserRole();
  // L'administrateur est en consultation seule.
  const canManage = userRole === 'agent' && isCurrentYear;
  // Même règle que l'API : seuls les admins suppriment une fiche (et seulement sans pièce rattachée).
  const canDelete = userRole === 'super_admin' && isCurrentYear;
  const hasActions = canManage || canDelete;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Actif' | 'Inactif'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedContribuable, setSelectedContribuable] = useState<UiContribuable | null>(null);
  const [rows, setRows] = useState<UiContribuable[]>([]);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Recherche, filtre et pagination côté serveur : la liste n'est pas limitée aux premiers contribuables.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { items, total: count } = await searchContribuablesPage({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        statut: statusFilter === 'all' ? undefined : statusFilter === 'Actif' ? 'actif' : 'inactif',
      });
      setRows(items.map((item: Contribuable) => ({
        id: item.id,
        name: `${item.prenom || ''} ${item.nom || ''}`.trim(),
        activityType: item.profession || item.typeContribuable || '-',
        zone: item.zone || '-',
        phone: item.telephone || '-',
        status: item.isActive === false ? 'Inactif' : 'Actif',
        nin: item.nin,
        email: item.email,
      })));
      setTotal(count);
    } catch {
      setRows([]);
      setTotal(0);
      showToast('Impossible de charger les contribuables.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, debouncedSearch, statusFilter]);

  const filteredData = rows;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get('name') || '').trim();
    const chunks = fullName.split(/\s+/).filter(Boolean);
    const prenom = chunks.shift() || 'Sans';
    const nom = chunks.join(' ') || 'Nom';
    
    const nin = String(fd.get('nin') || '').trim();
    const telephone = String(fd.get('phone') || '').trim();
    
    try {
      // Validation des doublons côté frontend
      const { ninExists, telephoneExists } = await validateContribuableDuplicates(nin, telephone);
      
      if (ninExists) {
        showToast('Ce numéro de carte d\'identité (NIN) est déjà utilisé par un autre contribuable.', 'error');
        return;
      }
      if (telephoneExists) {
        showToast('Ce numéro de téléphone est déjà utilisé par un autre contribuable.', 'error');
        return;
      }
      
      await createContribuable({
        nin,
        nom,
        prenom,
        telephone,
        adresse: String(fd.get('address') || '').trim(),
        profession: String(fd.get('activityType') || '').trim(),
        zone: String(fd.get('zone') || '').trim(),
        typeContribuable: String(fd.get('typeContribuable') || 'PARTICULIER'),
        email: String(fd.get('email') || '').trim() || undefined,
        dateNaiss: String(fd.get('dateNaiss') || '').trim() || undefined,
        lieuNaiss: String(fd.get('lieuNaiss') || '').trim() || undefined,
      });
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      // Gestion des erreurs venant du backend
      const message = getErrorMessage(error, 'La création du contribuable a échoué.');
      if (message.includes('NIN') || message.includes('carte d\'identité')) {
        showToast('Ce numéro de carte d\'identité (NIN) est déjà utilisé par un autre contribuable.', 'error');
      } else if (message.includes('téléphone')) {
        showToast('Ce numéro de téléphone est déjà utilisé par un autre contribuable.', 'error');
      } else {
        showToast(message, 'error');
      }
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContribuable) return;
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get('name') || '').trim();
    const chunks = fullName.split(/\s+/).filter(Boolean);
    const prenom = chunks.shift() || 'Sans';
    const nom = chunks.join(' ') || 'Nom';
    try {
      await updateContribuable(selectedContribuable.id, {
        nin: String(fd.get('nin') || '').trim(),
        nom,
        prenom,
        telephone: String(fd.get('phone') || '').trim(),
        zone: String(fd.get('zone') || '').trim(),
        profession: String(fd.get('activityType') || '').trim(),
        isActive: String(fd.get('status') || '') === 'Actif',
      });
      setShowEditModal(false);
      setSelectedContribuable(null);
      await loadData();
    } catch (error) {
      showToast(getErrorMessage(error, 'La modification du contribuable a échoué.'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!selectedContribuable) return;
    try {
      await deleteContribuable(selectedContribuable.id);
      setShowDeleteModal(false);
      setSelectedContribuable(null);
      await loadData();
    } catch (error) {
      // Ex. : fiche liée à des tickets, que le serveur refuse d'effacer.
      setShowDeleteModal(false);
      showToast(getErrorMessage(error, 'Erreur lors de la suppression.'), 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des contribuables</h1>
            <p className="text-sm text-gray-600 mt-1">Liste des contribuables enregistrés</p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 sm:w-auto"
            >
              <i className="ri-add-line text-lg"></i>
              Nouveau contribuable
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input
                type="text"
                placeholder="Rechercher par nom, téléphone, NIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('Actif')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === 'Actif' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Actifs
              </button>
              <button
                onClick={() => setStatusFilter('Inactif')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === 'Inactif' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Inactifs
              </button>
            </div>
          </div>
          <div className="mt-3 text-sm leading-6 text-gray-600">
            {loading ? 'Recherche...' : (
              <>
                Résultats : <span className="font-semibold text-teal-600">{total.toLocaleString('fr-FR')}</span> contribuable{total > 1 ? 's' : ''}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Contribuable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">NIN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Activité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Zone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Statut</th>
                  {hasActions && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.nin}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.activityType}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.zone}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'Actif' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.status}
                      </span>
                    </td>
                    {hasActions && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManage && (
                          <button
                            onClick={() => {
                              setSelectedContribuable(item);
                              setShowEditModal(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                            aria-label={`Modifier ${item.name}`}
                          >
                            <i className="ri-edit-line text-lg"></i>
                          </button>
                          )}
                          {canDelete && (
                          <button
                            onClick={() => {
                              setSelectedContribuable(item);
                              setShowDeleteModal(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                            aria-label={`Supprimer ${item.name}`}
                          >
                            <i className="ri-delete-bin-line text-lg"></i>
                          </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && rows.length === 0 && <p className="px-6 py-8 text-center text-sm text-gray-500">Aucun contribuable ne correspond à la recherche.</p>}
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 text-sm text-gray-600">
              <span>
                Page {page} sur {pageCount}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {canManage && showAddModal && (
        <Modal title="Nouveau contribuable" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleCreate} onInput={clearFieldValidationError} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nom complet *" name="name" required />
              <Input label="NIN (Numéro ID) *" name="nin" required placeholder="ex: 1234567890" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Téléphone *" name="phone" required placeholder="ex: 77 123 45 67" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  name="typeContribuable"
                  defaultValue="PARTICULIER"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm cursor-pointer"
                >
                  <option value="PARTICULIER">Particulier</option>
                  <option value="ENTREPRISE">Entreprise</option>
                  <option value="ASSOCIATION">Association</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Profession" name="activityType" placeholder="ex: Commerçant, Agriculteur..." />
              <Input label="Zone / Quartier" name="zone" placeholder="ex: Quartier Nord" />
            </div>
            <Input label="Email" name="email" type="email" placeholder="ex: email@exemple.com" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Date de naissance" name="dateNaiss" type="date" />
              <Input label="Lieu de naissance" name="lieuNaiss" placeholder="ex: Kafountine" />
            </div>
            <Textarea label="Adresse" name="address" />
            <Actions onCancel={() => setShowAddModal(false)} submitLabel="Enregistrer" />
          </form>
        </Modal>
      )}

      {canManage && showEditModal && selectedContribuable && (
        <Modal
          title="Modifier contribuable"
          onClose={() => {
            setShowEditModal(false);
            setSelectedContribuable(null);
          }}
        >
          <form onSubmit={handleEdit} onInput={clearFieldValidationError} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nom complet *" name="name" defaultValue={selectedContribuable.name} required />
              <Input label="NIN (Numéro ID) *" name="nin" defaultValue={selectedContribuable.nin} required placeholder="ex: 1234567890" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Téléphone *" name="phone" defaultValue={selectedContribuable.phone} required placeholder="ex: 77 123 45 67" />
              <Input label="Zone / Quartier" name="zone" defaultValue={selectedContribuable.zone} placeholder="ex: Quartier Nord" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Profession" name="activityType" defaultValue={selectedContribuable.activityType} placeholder="ex: Commerçant, Agriculteur..." />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  name="status"
                  defaultValue={selectedContribuable.status}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm cursor-pointer"
                >
                  <option>Actif</option>
                  <option>Inactif</option>
                </select>
              </div>
            </div>
            <Actions
              onCancel={() => {
                setShowEditModal(false);
                setSelectedContribuable(null);
              }}
              submitLabel="Mettre à jour"
            />
          </form>
        </Modal>
      )}

      {canDelete && showDeleteModal && selectedContribuable && (
        <Modal
          title="Confirmer la suppression"
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedContribuable(null);
          }}
        >
          <p className="text-sm text-gray-600">
            Supprimer <strong>{selectedContribuable.name}</strong> ?
          </p>
          <div className="flex items-center justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedContribuable(null);
              }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6">
          <h2 className="pr-4 text-lg font-semibold text-gray-900 sm:text-xl">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, name, required, defaultValue, type, placeholder }: { label: string; name: string; required?: boolean; defaultValue?: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        name={name}
        data-required={required ? 'true' : undefined}
        defaultValue={defaultValue}
        type={type || 'text'}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
      />
    </div>
  );
}

function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <textarea
        name={name}
        rows={3}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm resize-none"
      ></textarea>
    </div>
  );
}

function Actions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 whitespace-nowrap sm:w-auto"
      >
        Annuler
      </button>
      <button
        type="submit"
        className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 whitespace-nowrap sm:w-auto"
      >
        {submitLabel}
      </button>
    </div>
  );
}
