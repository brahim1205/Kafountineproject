import type { Expedition } from '../../../../services/quai-peche';
import { STATUTS_EXPEDITION, StatutBadge, formatDate, formatFcfa, formatKg } from './statuts';

type ExpeditionsTableProps = {
  expeditions: Expedition[];
  loading: boolean;
  onView: (expedition: Expedition) => void;
};

const COLUMNS = ['N° Expédition', 'Camion', 'Poids', 'Destination', 'Montant', 'Date', 'Statut'];

export default function ExpeditionsTable({ expeditions, loading, onView }: ExpeditionsTableProps) {
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
            {loading || expeditions.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-6 py-8 text-center text-gray-500">
                  {loading ? 'Chargement...' : 'Aucune expédition trouvée'}
                </td>
              </tr>
            ) : (
              expeditions.map((expedition) => (
                <tr key={expedition.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{expedition.numero}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-mono">{expedition.camion?.immatriculation || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatKg(expedition.poids)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{expedition.destination || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatFcfa(expedition.montant)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatDate(expedition.date)}</td>
                  <td className="px-6 py-4">
                    <StatutBadge statut={expedition.statut} statuts={STATUTS_EXPEDITION} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onView(expedition)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Voir"
                      aria-label={`Voir l'expédition ${expedition.numero}`}
                    >
                      <i className="ri-eye-line"></i>
                    </button>
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
