import { useEffect, useMemo, useState } from 'react';
import { listPlacesMarche } from '../../../services/marche';
import { getStoredUserRole, canWriteData } from '../../../services/auth';
import { useYear } from '../../../contexts/YearContext';
import PlacesTable from './places/PlacesTable';
import PlaceDetailModal from './places/PlaceDetailModal';
import ResiliationModal from './places/ResiliationModal';
import AttributionModal from './places/AttributionModal';
import { INPUT_CLASS, TYPES_PLACE, optionsFrom, toUiPlace, type UiPlace } from './places/places';

type Modal = { type: 'attribution'; place: UiPlace | null } | { type: 'detail' | 'resiliation'; place: UiPlace } | null;

export default function AttributionPlaces() {
  const { selectedYear } = useYear();
  const isCurrentYear = selectedYear === new Date().getFullYear();
  const userRole = getStoredUserRole() || 'admin';
  const canManage = userRole !== 'super_admin' && canWriteData(userRole) && isCurrentYear;

  const [places, setPlaces] = useState<UiPlace[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterType, setFilterType] = useState('tous');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadPlaces = async () => {
    try {
      setError('');
      setPlaces((await listPlacesMarche(selectedYear)).map(toUiPlace));
    } catch {
      setPlaces([]);
      setError('Impossible de charger les places du marché.');
    }
  };

  useEffect(() => {
    loadPlaces();
  }, [selectedYear]);

  const types = useMemo(() => optionsFrom(TYPES_PLACE, places.map((p) => p.type)), [places]);
  const zones = useMemo(() => optionsFrom([], places.map((p) => p.zone)), [places]);
  const disponibles = places.filter((p) => p.statut === 'Disponible');
  const filteredPlaces = places.filter(
    (place) => (filterStatut === 'tous' || place.statut === filterStatut) && (filterType === 'tous' || place.type === filterType)
  );

  const stats = useMemo(() => {
    const total = places.length;
    const occupees = places.filter((p) => p.statut === 'Occupée').length;
    return [
      { label: 'Places totales', value: total, icon: 'ri-store-2-line', tone: 'bg-cyan-100 text-cyan-600' },
      { label: 'Places occupées', value: occupees, icon: 'ri-checkbox-circle-line', tone: 'bg-emerald-100 text-emerald-600' },
      { label: 'Places disponibles', value: total - occupees, icon: 'ri-time-line', tone: 'bg-yellow-100 text-yellow-600' },
      { label: "Taux d'occupation", value: `${total ? Math.round((occupees / total) * 100) : 0}%`, icon: 'ri-percent-line', tone: 'bg-sky-100 text-sky-600' },
    ];
  }, [places]);

  const afterChange = (message: string) => async () => {
    setModal(null);
    await loadPlaces();
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="space-y-4">
      {successMessage && (
        <div role="status" className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <i className="ri-checkbox-circle-line text-2xl"></i>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.tone}`}>
              <i className={`${stat.icon} text-xl`}></i>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className={INPUT_CLASS}>
              <option value="tous">Tous les statuts</option>
              <option value="Occupée">Occupée</option>
              <option value="Disponible">Disponible</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de place</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={INPUT_CLASS}>
              <option value="tous">Tous les types</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {canManage && (
            <button
              onClick={() => setModal({ type: 'attribution', place: null })}
              className="px-4 py-2.5 bg-cyan-500 text-white text-sm font-medium rounded-lg hover:bg-cyan-600 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Attribuer une place
            </button>
          )}
        </div>
      </div>

      <PlacesTable
        places={filteredPlaces}
        canManage={canManage}
        onDetail={(place) => setModal({ type: 'detail', place })}
        onAttribuer={(place) => setModal({ type: 'attribution', place })}
        onResilier={(place) => setModal({ type: 'resiliation', place })}
      />

      {modal?.type === 'detail' && <PlaceDetailModal place={modal.place} onClose={() => setModal(null)} />}
      {canManage && modal?.type === 'resiliation' && (
        <ResiliationModal place={modal.place} onClose={() => setModal(null)} onDone={afterChange('Attribution résiliée, la place est disponible.')} />
      )}
      {canManage && modal?.type === 'attribution' && (
        <AttributionModal
          initialPlace={modal.place}
          placesDisponibles={disponibles}
          types={types}
          zones={zones}
          selectedYear={selectedYear}
          onClose={() => setModal(null)}
          onDone={afterChange('Place attribuée avec succès !')}
        />
      )}
    </div>
  );
}
