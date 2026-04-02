import { useEffect, useMemo, useState } from 'react';
import {
  listPlacesMarche,
  createPlaceMarche,
  updatePlaceMarche,
  type PlaceMarche,
} from '../../../services/marche';
import { ensureContribuableByIdentity } from '../../../services/contribuables';
import { getStoredUserRole } from '../../../services/auth';
import { useYear } from '../../../contexts/YearContext';

type PlaceStatusLabel = 'Occupée' | 'Disponible';

type UiPlaceMarche = PlaceMarche & {
  statut: PlaceStatusLabel;
  occupant: string | null;
};

export default function AttributionPlaces() {
  const { selectedYear } = useYear();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userRole = getStoredUserRole() || 'admin';
  const canManage = userRole !== 'super_admin' && userRole !== 'comptable' && isCurrentYear;
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResiliationModal, setShowResiliationModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<UiPlaceMarche | null>(null);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterType, setFilterType] = useState('tous');
  const [places, setPlaces] = useState<UiPlaceMarche[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listPlacesMarche(selectedYear)
      .then((data) => {
        setError('');
        const mapped = (data || []).map((p: PlaceMarche): UiPlaceMarche => ({
          ...p,
          statut: p.statut === 'OCCUPEE' ? 'Occupée' : 'Disponible',
          occupant: p.occupantId || null,
        }));
        setPlaces(mapped);
      })
      .catch(() => {
        setPlaces([]);
        setError("Impossible de charger les places du marché.");
      });
  }, [selectedYear]);

  const filteredPlaces = places.filter(place => {
    const matchStatut = filterStatut === 'tous' || place.statut === filterStatut;
    const matchType = filterType === 'tous' || place.type === filterType;
    return matchStatut && matchType;
  });

  const quickStats = useMemo(() => {
    const total = places.length;
    const occupees = places.filter((p) => p.statut === 'Occupée').length;
    const disponibles = Math.max(total - occupees, 0);
    const taux = total > 0 ? Math.round((occupees / total) * 100) : 0;
    return { total, occupees, disponibles, taux };
  }, [places]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const selectedPlaceId = formData.get('placeId') as string;
      const newPlaceNumber = formData.get('newPlaceNumber') as string;
      const placeType = formData.get('type') as string;
      const zone = formData.get('zone') as string;
      const tarif = parseInt(formData.get('tarif') as string) || 0;
      const periode = formData.get('periode') as string;
      
      // First ensure the contribuable exists
      const contribuable = await ensureContribuableByIdentity({
        cni: (formData.get('cni') as string) || '',
        fullName: (formData.get('nomComplet') as string) || '',
        telephone: (formData.get('telephone') as string) || '',
        adresse: (formData.get('adresse') as string) || '',
      });
      const occupantId = contribuable.id;
      
      let placeId = selectedPlaceId;
      
      // If no existing place selected, create a new one
      if (!placeId && newPlaceNumber) {
        const newPlace = await createPlaceMarche({
          numeroPlace: newPlaceNumber,
          type: placeType,
          zone: zone,
          occupantId: occupantId,
          activite: formData.get('activite') as string,
          tarif: tarif,
          periode: periode,
          statut: 'OCCUPEE',
        });
        placeId = newPlace.id;
      } else if (placeId) {
        // Update existing place to occupied
        await updatePlaceMarche(placeId, {
          occupantId: occupantId,
          activite: formData.get('activite') as string,
          tarif: tarif,
          periode: periode,
          statut: 'OCCUPEE',
        });
      }

      // Refresh the list
      listPlacesMarche()
        .then((data) => {
          setError('');
          const mapped = (data || []).map((p: PlaceMarche): UiPlaceMarche => ({
            ...p,
            statut: p.statut === 'OCCUPEE' ? 'Occupée' : 'Disponible',
            occupant: p.occupantId || null,
          }));
          setPlaces(mapped);
        })
        .catch(() => {
          setPlaces([]);
          setError("Impossible de rafraîchir les places du marché.");
        });

      setShowModal(false);
      setSuccessMessage('Place attribuée avec succès !');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'attribuer la place");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoirDetail = (place: UiPlaceMarche) => {
    setSelectedPlace(place);
    setShowDetailModal(true);
  };

  const handleAttribuer = (place: UiPlaceMarche) => {
    setSelectedPlace(place);
    setShowModal(true);
  };

  const handleResilier = (place: UiPlaceMarche) => {
    setSelectedPlace(place);
    setShowResiliationModal(true);
  };

  const handleConfirmResiliation = () => {
    setShowResiliationModal(false);
    setSelectedPlace(null);
    setSuccessMessage('Place résiliée avec succès !');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Message de succès */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <i className="ri-checkbox-circle-line text-2xl"></i>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <i className="ri-store-2-line text-cyan-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{quickStats.total}</p>
          <p className="text-sm text-gray-600">Places totales</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-emerald-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{quickStats.occupees}</p>
          <p className="text-sm text-gray-600">Places occupées</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <i className="ri-time-line text-yellow-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{quickStats.disponibles}</p>
          <p className="text-sm text-gray-600">Places disponibles</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
              <i className="ri-percent-line text-sky-600 text-xl"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{quickStats.taux}%</p>
          <p className="text-sm text-gray-600">Taux d'occupation</p>
        </div>
      </div>

      {/* Filtres et actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="tous">Tous les statuts</option>
              <option value="Occupée">Occupée</option>
              <option value="Disponible">Disponible</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de place</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="tous">Tous les types</option>
              <option value="Place de marché">Place de marché</option>
              <option value="Kiosque">Kiosque</option>
              <option value="Boutique">Boutique</option>
              <option value="Hangar">Hangar</option>
            </select>
          </div>

          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-cyan-500 text-white text-sm font-medium rounded-lg hover:bg-cyan-600 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Attribuer une place
            </button>
          )}
        </div>
      </div>

      {/* Liste des places */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Numéro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Activité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Tarif</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Statut</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                  {canManage ? 'Actions' : 'Consultation'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlaces.map((place) => (
                <tr key={place.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{place.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{place.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{place.zone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{place.activite || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-cyan-600 whitespace-nowrap">{place.tarif.toLocaleString()} FCFA/{place.periode}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                      place.statut === 'Occupée' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {place.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleVoirDetail(place)}
                        className="w-8 h-8 flex items-center justify-center text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                        title="Voir détails"
                      >
                        <i className="ri-eye-line"></i>
                      </button>
                      {canManage && place.statut === 'Disponible' && (
                        <button 
                          onClick={() => handleAttribuer(place)}
                          className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Attribuer la place"
                        >
                          <i className="ri-user-add-line"></i>
                        </button>
                      )}
                      {canManage && place.statut === 'Occupée' && (
                        <button 
                          onClick={() => handleResilier(place)}
                          className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Résilier l'attribution"
                        >
                          <i className="ri-user-unfollow-line"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Détail Place */}
      {showDetailModal && selectedPlace && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Détails de la place</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPlace(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Numéro de place</p>
                  <p className="text-base font-semibold text-gray-900">{selectedPlace.numero}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Type</p>
                  <p className="text-base font-medium text-gray-900">{selectedPlace.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Zone</p>
                  <p className="text-base font-medium text-gray-900">{selectedPlace.zone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Statut</p>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                    selectedPlace.statut === 'Occupée' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedPlace.statut}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tarif</p>
                  <p className="text-lg font-bold text-cyan-600">{selectedPlace.tarif.toLocaleString()} FCFA/{selectedPlace.periode}</p>
                </div>
                {selectedPlace.occupant && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Occupant</p>
                      <p className="text-base font-medium text-gray-900">{selectedPlace.occupant}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Activité</p>
                      <p className="text-base font-medium text-gray-900">{selectedPlace.activite}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                      <p className="text-base font-medium text-gray-900">{selectedPlace.telephone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Date d'attribution</p>
                      <p className="text-base font-medium text-gray-900">{selectedPlace.dateAttribution}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPlace(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Résiliation */}
      {canManage && showResiliationModal && selectedPlace && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-alert-line text-2xl text-red-600"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Confirmer la résiliation</h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Êtes-vous sûr de vouloir résilier l'attribution de la place <strong>{selectedPlace.numero}</strong> occupée par <strong>{selectedPlace.occupant}</strong> ?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResiliationModal(false);
                    setSelectedPlace(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmResiliation}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Résilier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal attribution */}
      {canManage && showModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Attribuer une place</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedPlace(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type d'attribution */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'attribution <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="attributionType"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="nouveau">Créer une nouvelle place</option>
                    <option value="existant">Attribuer une place existante</option>
                  </select>
                </div>

                {/* Numéro de place (pour nouvelle place) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de place <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="newPlaceNumber"
                    required
                    placeholder="Ex: A-001, B-012"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                {/* Sélection place existante */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Place existante
                  </label>
                  <select
                    name="placeId"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="">Sélectionnez une place (optionnel)</option>
                    {places.filter(p => p.statut === 'Disponible').map(place => (
                      <option key={place.id} value={place.id}>
                        {place.numero} - {place.type} - {place.zone} - {place.tarif.toLocaleString()} FCFA/{place.periode}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type de place */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de place <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="">Sélectionnez</option>
                    <option value="Boutique">Bouche</option>
                    <option value="Hangar">Hangar</option>
                    <option value="Etal">Étal</option>
                    <option value="Emplacement">Emplacement</option>
                  </select>
                </div>

                {/* Zone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zone <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="zone"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="">Sélectionnez</option>
                    <option value="Zone A - Centre">Zone A - Centre</option>
                    <option value="Zone B - Nord">Zone B - Nord</option>
                    <option value="Zone C - Sud">Zone C - Sud</option>
                    <option value="Zone D - Est">Zone D - Est</option>
                    <option value="Zone E - Ouest">Zone E - Ouest</option>
                  </select>
                </div>

                {/* Tarif */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarif (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="tarif"
                    required
                    placeholder="Ex: 25000"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                {/* Période */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Période <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="periode"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="">Sélectionnez</option>
                    <option value="mois">Mois</option>
                    <option value="trimestre">Trimestre</option>
                    <option value="semestre">Semestre</option>
                    <option value="annee">Année</option>
                  </select>
                </div>

                {/* Informations commerçant */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Informations du commerçant</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nomComplet"
                    required
                    placeholder="Ex: Fatou Diallo"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro CNI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cni"
                    required
                    placeholder="Ex: 1234567890123"
                    maxLength={13}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    required
                    placeholder="Ex: 77 123 45 67"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'activité <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="activite"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Sélectionnez</option>
                    <option value="Fruits et légumes">Fruits et légumes</option>
                    <option value="Poissonnerie">Poissonnerie</option>
                    <option value="Boucherie">Boucherie</option>
                    <option value="Épicerie">Épicerie</option>
                    <option value="Vêtements">Vêtements</option>
                    <option value="Chaussures">Chaussures</option>
                    <option value="Électronique">Électronique</option>
                    <option value="Restauration">Restauration</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    name="adresse"
                    placeholder="Ex: Quartier Nord, Kafountine"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                {/* Date de début */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateDebut"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                {/* Durée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="duree"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="1">1 mois</option>
                    <option value="3">3 mois</option>
                    <option value="6">6 mois</option>
                    <option value="12">12 mois</option>
                  </select>
                </div>

                {/* Observations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observations
                  </label>
                  <textarea
                    name="observations"
                    rows={3}
                    placeholder="Notes ou informations complémentaires..."
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedPlace(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 text-white text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer ${
                    isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600 transition-colors'
                  }`}
                >
                  <i className={`ri-${isSubmitting ? 'loader-4-line animate-spin' : 'check-line'} mr-2`}></i>
                  {isSubmitting ? 'Enregistrement...' : 'Attribuer la place'}
                </button>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  <i className="ri-error-warning-line mr-2"></i>
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
