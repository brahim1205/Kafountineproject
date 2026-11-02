import type { CamionFrigorifique } from '../../../../services/quai-peche';
import { STATUTS_CAMION, StatutBadge, formatKg } from './statuts';

type CamionsTableProps = {
  camions: CamionFrigorifique[];
  loading: boolean;
  canManage: boolean;
  onView: (camion: CamionFrigorifique) => void;
  onDelete: (camion: CamionFrigorifique) => void;
};

const COLUMNS = ['Immatriculation', 'Marque', 'Modèle', 'Capacité', 'Chauffeur', 'Téléphone', 'Expéditions', 'Statut'];

export default function CamionsTable({ camions, loading, canManage, onView, onDelete }: CamionsTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{column}</th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading || camions.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-6 py-8 text-center text-gray-500">
                  {loading ? 'Chargement...' : 'Aucun camion trouvé'}
                </td>
              </tr>
            ) : (
              camions.map((camion) => (
                <tr key={camion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">{camion.immatriculation}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{camion.marque}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{camion.modele || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatKg(camion.capacite)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{camion.chauffeur || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{camion.telephone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{camion._count?.expeditions ?? 0}</td>
                  <td className="px-6 py-4">
                    <StatutBadge statut={camion.statut} statuts={STATUTS_CAMION} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onView(camion)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Voir"
                        aria-label={`Voir le camion ${camion.immatriculation}`}
                      >
                        <i className="ri-eye-line"></i>
                      </button>
                      {canManage && (
                        <button
                          onClick={() => onDelete(camion)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                          aria-label={`Supprimer le camion ${camion.immatriculation}`}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
