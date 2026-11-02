import { useEffect, useState } from 'react';
import { updatePermission, type Permission } from '../../../services/settings';
import { PRIMARY_BUTTON, SectionHeader } from './ui';

type Role = 'agent' | 'superviseur' | 'comptable' | 'admin';

const ROLES: Array<{ key: Role; api: string; label: string }> = [
  { key: 'agent', api: 'AGENT', label: 'Agent' },
  { key: 'superviseur', api: 'SUPERVISEUR', label: 'Superviseur' },
  { key: 'comptable', api: 'COMPTABLE', label: 'Comptable' },
  { key: 'admin', api: 'ADMIN', label: 'Administrateur' },
];

type PermissionsTabProps = {
  permissions: Permission[];
  onSaved: (message: string) => void;
  onError: (message: string) => void;
};

export default function PermissionsTab({ permissions, onSaved, onError }: PermissionsTabProps) {
  const [draft, setDraft] = useState(permissions);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(permissions), [permissions]);

  const changes = draft.flatMap((perm, index) =>
    ROLES.filter((role) => perm[role.key] !== permissions[index]?.[role.key]).map((role) => ({
      module: perm.module,
      role: role.api,
      enabled: perm[role.key],
    }))
  );

  const toggle = (moduleIndex: number, role: Role) => {
    setDraft(draft.map((perm, index) => (index === moduleIndex ? { ...perm, [role]: !perm[role] } : perm)));
  };

  const save = async () => {
    setSaving(true);
    try {
      // Seules les cases modifiées sont envoyées.
      for (const change of changes) {
        await updatePermission(change);
      }
      onSaved(`${changes.length} permission(s) enregistrée(s).`);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Impossible d’enregistrer les permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Gestion des permissions granulaires par rôle et module"
        action={
          <button onClick={save} disabled={saving || changes.length === 0} className={PRIMARY_BUTTON}>
            <i className="ri-save-line"></i>
            {saving ? 'Enregistrement...' : `Enregistrer les permissions${changes.length ? ` (${changes.length})` : ''}`}
          </button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Module</th>
              {ROLES.map((role) => (
                <th key={role.key} className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{role.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {draft.map((perm, index) => (
              <tr key={perm.module} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{perm.module}</td>
                {ROLES.map((role) => (
                  <td key={role.key} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm[role.key]}
                      onChange={() => toggle(index, role.key)}
                      aria-label={`${role.label} — ${perm.module}`}
                      className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
            {draft.length === 0 && (
              <tr>
                <td colSpan={ROLES.length + 1} className="px-4 py-8 text-center text-gray-500">
                  Impossible de charger les permissions depuis le backend.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
