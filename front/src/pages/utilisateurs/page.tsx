import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import { createUser, deleteUser, listUsers, updateUser } from '../../services/users';
import { useYear } from '../../contexts/YearContext';
import { useToast } from '../../components/feature/Toast';
import {
  clearFieldValidationError,
  getErrorMessage,
  validateFormElement,
} from '../../utils/formValidation';

type UiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  status: string;
  lastLogin: string;
};

const ROLE_OPTIONS = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISEUR', 'SERVICE_FINANCES', 'COMPTABLE', 'QUAI_PECHE', 'AGENT'];

export default function Utilisateurs() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [rows, setRows] = useState<UiUser[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UiUser | null>(null);

  const loadData = async () => {
    try {
      const data = await listUsers();
      const mapped = (data || []).map((item) => ({
        id: item.id,
        name: `${item.prenom || ''} ${item.nom || ''}`.trim(),
        email: item.email,
        role: item.role,
        phone: item.telephone || '-',
        status: item.isActive ? 'Actif' : 'Inactif',
        lastLogin: item.lastLogin ? new Date(item.lastLogin).toLocaleString('fr-FR') : '-',
      }));
      setRows(mapped);
    } catch {
      setRows([]);
      showToast("Impossible de charger les utilisateurs.", 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return rows.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || item.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [rows, searchTerm, filterRole]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get('name') || '').trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const prenom = parts.shift() || 'Sans';
    const nom = parts.join(' ') || 'Nom';

    try {
      await createUser({
        email: String(fd.get('email') || '').trim(),
        prenom,
        nom,
        role: String(fd.get('role') || 'AGENT'),
        telephone: String(fd.get('phone') || '').trim(),
        password: String(fd.get('password') || '').trim(),
      });
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      showToast(
        getErrorMessage(error, "La création de l'utilisateur a échoué."),
        'error',
      );
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get('name') || '').trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const prenom = parts.shift() || 'Sans';
    const nom = parts.join(' ') || 'Nom';
    try {
      await updateUser(selectedUser.id, {
        email: String(fd.get('email') || '').trim(),
        prenom,
        nom,
        role: String(fd.get('role') || 'AGENT'),
        telephone: String(fd.get('phone') || '').trim(),
        isActive: String(fd.get('status') || 'Actif') === 'Actif',
        // Champ laissé vide : le mot de passe actuel est conservé.
        ...(String(fd.get('password') || '').trim() ? { password: String(fd.get('password')).trim() } : {}),
      });
      setShowEditModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (error) {
      showToast(
        getErrorMessage(error, "La mise à jour de l'utilisateur a échoué."),
        'error',
      );
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadData();
    } catch {
      showToast("Erreur lors de la suppression de l'utilisateur.", 'error');
    }
  };

  const statAdmin = rows.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
  const statAgent = rows.filter((u) => u.role === 'AGENT').length;
  const statComptable = rows.filter((u) => u.role === 'COMPTABLE').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
            <p className="text-sm text-gray-600 mt-1">Administration des comptes et des rôles</p>
          </div>
          {isCurrentYear && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ri-user-add-line text-lg"></i>
            Nouvel utilisateur
          </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <Stat title="Total" value={rows.length} icon="ri-user-line" />
          <Stat title="Administrateurs" value={statAdmin} icon="ri-shield-user-line" />
          <Stat title="Agents" value={statAgent} icon="ri-user-settings-line" />
          <Stat title="Comptables" value={statComptable} icon="ri-bank-card-line" />
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm cursor-pointer"
            >
              <option value="all">Tous les rôles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Rôle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Dernière connexion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.lastLogin}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'Actif' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <i className="ri-edit-line text-lg"></i>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-lg"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <Modal title="Nouvel utilisateur" onClose={() => setShowAddModal(false)}>
          <UserForm onSubmit={handleCreate} onCancel={() => setShowAddModal(false)} requirePassword />
        </Modal>
      )}

      {showEditModal && selectedUser && (
        <Modal
          title="Modifier utilisateur"
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        >
          <UserForm
            onSubmit={handleEdit}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            defaultValues={{
              name: selectedUser.name,
              email: selectedUser.email,
              role: selectedUser.role,
              phone: selectedUser.phone,
              status: selectedUser.status,
            }}
          />
        </Modal>
      )}

      {showDeleteModal && selectedUser && (
        <Modal
          title="Confirmer la suppression"
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
        >
          <p className="text-sm text-gray-600">Supprimer <strong>{selectedUser.name}</strong> ?</p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
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
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <i className={`${icon} text-2xl`}></i>
        </div>
      </div>
    </div>
  );
}

function UserForm({
  onSubmit,
  onCancel,
  defaultValues,
  requirePassword = false,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  defaultValues?: { name?: string; email?: string; role?: string; phone?: string; status?: string };
  requirePassword?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} onInput={clearFieldValidationError} noValidate className="space-y-4">
      {/* Première ligne: Nom complet + Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nom complet" name="name" required defaultValue={defaultValues?.name} />
        <Field label="Email" name="email" type="email" required defaultValue={defaultValues?.email} />
      </div>
      
      {/* Deuxième ligne: Téléphone + Rôle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Téléphone" name="phone" defaultValue={defaultValues?.phone} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
          <select
            name="role"
            defaultValue={defaultValues?.role || 'AGENT'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm cursor-pointer"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Troisième ligne: Mot de passe + Statut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Mot de passe" name="password" type="password" required={requirePassword} minLength={12} autoComplete="new-password" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
          <select
            name="status"
            defaultValue={defaultValues?.status || 'Actif'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm cursor-pointer"
          >
            <option>Actif</option>
            <option>Inactif</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap">
          Annuler
        </button>
        <button type="submit" className="px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">
          Enregistrer
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  minLength,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        name={name}
        type={type}
        data-required={required ? 'true' : undefined}
        minLength={minLength}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
      />
    </div>
  );
}
