import { formatTarif, statutBadge, type UiPlace } from './places';

export default function PlaceDetailModal({ place, onClose }: { place: UiPlace; onClose: () => void }) {
  const details: Array<[string, string]> = [
    ['Numéro de place', place.numero],
    ['Type', place.type],
    ['Zone', place.zone],
    ['Tarif', formatTarif(place)],
  ];
  if (place.occupantId) {
    details.push(
      ['Occupant', place.occupant || '-'],
      ['Activité', place.activite || '-'],
      ['Téléphone', place.telephone || '-'],
      ["Date d'attribution", place.dateAttribution ? new Date(place.dateAttribution).toLocaleDateString('fr-FR') : '-']
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Détails de la place</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <dl className="p-6 grid grid-cols-2 gap-4">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-gray-600 mb-1">{label}</dt>
              <dd className="text-base font-medium text-gray-900">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-sm text-gray-600 mb-1">Statut</dt>
            <dd>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${statutBadge(place.statut)}`}>{place.statut}</span>
            </dd>
          </div>
        </dl>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
