import { tauxRealisation, type LigneBudgetaire } from '../../../services/budget';

type BudgetTableProps = {
  lignes: LigneBudgetaire[];
  loading: boolean;
  year: number;
  busy: boolean;
  /** Absent : l'utilisateur ne peut pas supprimer (réservé aux admins par l'API). */
  onDelete?: (ligne: LigneBudgetaire) => void;
  onEdit: (ligne: LigneBudgetaire) => void;
  onView: (ligne: LigneBudgetaire) => void;
};

const HEADERS: Array<[string, string]> = [
  ['Code', 'text-left'],
  ['Catégorie', 'text-left'],
  ['Budgétisé', 'text-right'],
  ['Dépensé', 'text-right'],
  ['Reste', 'text-right'],
  ['Réalisation', 'text-center'],
  ['Actions', 'text-center'],
];

export default function BudgetTable({ lignes, loading, year, busy, onEdit, onView, onDelete }: BudgetTableProps) {
  const message = loading ? 'Chargement des données...' : lignes.length === 0 ? `Aucune ligne budgétaire disponible pour l'année ${year}.` : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Lignes Budgétaires</h2>
        <p className="text-sm text-gray-600 mt-1">Gestion des catégories de budget</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {HEADERS.map(([label, align]) => (
                <th key={label} className={`px-6 py-3 ${align} text-xs font-medium text-gray-600 uppercase`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {message ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-6 py-8 text-center text-gray-500">
                  {message}
                </td>
              </tr>
            ) : (
              lignes.map((ligne) => {
                const reste = ligne.prevu - ligne.depense;
                const realise = tauxRealisation(ligne);
                return (
                  <tr key={ligne.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{ligne.code}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{ligne.libelle}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{ligne.prevu.toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{ligne.depense.toLocaleString('fr-FR')}</td>
                    <td className={`px-6 py-4 text-sm text-right font-medium ${reste >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reste.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${realise > 100 ? 'bg-red-500' : 'bg-teal-500'}`}
                            style={{ width: `${Math.min(realise, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-medium ${realise > 100 ? 'text-red-600' : 'text-gray-600'}`}>{realise}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                          title="Modifier"
                          aria-label={`Modifier la ligne ${ligne.code}`}
                          onClick={() => onEdit(ligne)}
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Voir les détails"
                          aria-label={`Détails de la ligne ${ligne.code}`}
                          onClick={() => onView(ligne)}
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        {onDelete && (
                          <button
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="Supprimer"
                            aria-label={`Supprimer la ligne ${ligne.code}`}
                            disabled={busy}
                            onClick={() => onDelete(ligne)}
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        )}
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
  );
}
