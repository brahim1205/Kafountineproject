import { formatTarif, statutBadge, type UiPlace } from './places';

type PlacesTableProps = {
  places: UiPlace[];
  canManage: boolean;
  onDetail: (place: UiPlace) => void;
  onAttribuer: (place: UiPlace) => void;
  onResilier: (place: UiPlace) => void;
};

const COLUMNS = ['Numéro', 'Type', 'Zone', 'Occupant', 'Activité', 'Tarif', 'Statut'];

export default function PlacesTable({ places, canManage, onDetail, onAttribuer, onResilier }: PlacesTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">{column}</th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                {canManage ? 'Actions' : 'Consultation'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {places.map((place) => (
              <tr key={place.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{place.numero}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{place.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{place.zone}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{place.occupant || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{place.activite || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-cyan-600 whitespace-nowrap">{formatTarif(place)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statutBadge(place.statut)}`}>{place.statut}</span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onDetail(place)}
                      className="w-8 h-8 flex items-center justify-center text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                      title="Voir détails"
                      aria-label={`Détails de la place ${place.numero}`}
                    >
                      <i className="ri-eye-line"></i>
                    </button>
                    {canManage && place.statut === 'Disponible' && (
                      <button
                        onClick={() => onAttribuer(place)}
                        className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Attribuer la place"
                        aria-label={`Attribuer la place ${place.numero}`}
                      >
                        <i className="ri-user-add-line"></i>
                      </button>
                    )}
                    {canManage && place.statut === 'Occupée' && (
                      <button
                        onClick={() => onResilier(place)}
                        className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Résilier l'attribution"
                        aria-label={`Résilier la place ${place.numero}`}
                      >
                        <i className="ri-user-unfollow-line"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {places.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                  Aucune place ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
