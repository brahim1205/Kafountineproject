import type { Penalite } from '../../../services/settings';
import { PRIMARY_BUTTON, SectionHeader } from './ui';

type PenalitesTabProps = {
  penalites: Penalite[];
  onAdd: () => void;
  onEdit: (penalite: Penalite) => void;
  onToggle: (penalite: Penalite) => void;
  onDelete: (penalite: Penalite) => void;
  /** Consultation seule (administrateur) : aucune action de modification. */
  readOnly?: boolean;
};

export default function PenalitesTab({ penalites, onAdd, onEdit, onToggle, onDelete, readOnly = false }: PenalitesTabProps) {
  return (
    <div>
      <SectionHeader
        title="Gestion des pénalités et calculs automatiques"
        action={
          readOnly ? null : (
            <button onClick={onAdd} className={PRIMARY_BUTTON}>
              <i className="ri-add-line"></i>
              Nouvelle pénalité
            </button>
          )
        }
      />
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
              role="switch"
              aria-checked={penalite.actif}
              aria-label={`Activer ${penalite.type}`}
              onClick={() => onToggle(penalite)}
              disabled={readOnly}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${penalite.actif ? 'bg-emerald-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${penalite.actif ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
            {!readOnly && (
            <div className="ml-4 flex items-center gap-3">
              <button onClick={() => onEdit(penalite)} className="text-emerald-600 hover:text-emerald-700" aria-label={`Modifier ${penalite.type}`}>
                <i className="ri-edit-line"></i>
              </button>
              <button onClick={() => onDelete(penalite)} className="text-red-600 hover:text-red-700" aria-label={`Supprimer ${penalite.type}`}>
                <i className="ri-delete-bin-line"></i>
              </button>
            </div>
            )}
          </div>
        ))}
        {penalites.length === 0 && <div className="text-center py-8 text-gray-500">Aucune pénalité configurée.</div>}
      </div>
    </div>
  );
}
