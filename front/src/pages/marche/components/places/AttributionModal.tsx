import { useState } from 'react';
import { createPlaceMarche, updatePlaceMarche } from '../../../../services/marche';
import { ensureContribuableByIdentity } from '../../../../services/contribuables';
import { clearFieldValidationError, validateFormElement } from '../../../../utils/formValidation';
import { ACTIVITES, INPUT_CLASS, PERIODES, formatTarif, type UiPlace } from './places';

type Mode = 'nouveau' | 'existant';

type AttributionModalProps = {
  /** Place disponible présélectionnée (clic sur une ligne du tableau). */
  initialPlace: UiPlace | null;
  placesDisponibles: UiPlace[];
  types: string[];
  zones: string[];
  selectedYear: number;
  onClose: () => void;
  onDone: () => Promise<void>;
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

export default function AttributionModal({
  initialPlace,
  placesDisponibles,
  types,
  zones,
  selectedYear,
  onClose,
  onDone,
}: AttributionModalProps) {
  const [mode, setMode] = useState<Mode>(initialPlace || placesDisponibles.length > 0 ? 'existant' : 'nouveau');
  const [placeId, setPlaceId] = useState(initialPlace?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const place = placesDisponibles.find((candidate) => candidate.id === placeId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!validateFormElement(e.currentTarget)) {
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const field = (name: string) => ((formData.get(name) as string) || '').trim();

      const commercant = await ensureContribuableByIdentity({
        cni: field('cni'),
        fullName: field('nomComplet'),
        telephone: field('telephone'),
        adresse: field('adresse'),
      });
      const attribution = {
        occupantId: commercant.id,
        activite: field('activite'),
        tarif: Number(field('tarif')),
        periode: field('periode'),
        statut: 'OCCUPEE',
      };

      if (mode === 'existant') {
        await updatePlaceMarche(placeId, attribution);
      } else {
        await createPlaceMarche({ ...attribution, numeroPlace: field('numeroPlace'), type: field('type'), zone: field('zone'), year: selectedYear });
      }
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'attribuer la place");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Attribuer une place</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} onInput={clearFieldValidationError} noValidate className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label required>Type d'attribution</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['existant', 'Place existante', `${placesDisponibles.length} disponible(s)`],
                  ['nouveau', 'Nouvelle place', 'Créer et attribuer'],
                ] as const).map(([value, titre, description]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      mode === value ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === value}
                      disabled={value === 'existant' && placesDisponibles.length === 0}
                      onChange={() => setMode(value)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{titre}</span>
                      <span className="block text-xs text-gray-500">{description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {mode === 'existant' ? (
              <div className="md:col-span-2">
                <Label required>Place</Label>
                <select
                  name="placeId"
                  data-required="true"
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  className={`${INPUT_CLASS} cursor-pointer`}
                >
                  <option value="">Sélectionnez une place disponible</option>
                  {placesDisponibles.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.numero} — {candidate.type} — {candidate.zone} — {formatTarif(candidate)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="md:col-span-2">
                  <Label required>Numéro de place</Label>
                  <input name="numeroPlace" data-required="true" placeholder="Ex: A-03, B-13" className={INPUT_CLASS} />
                </div>
                <div>
                  <Label required>Type de place</Label>
                  <input name="type" list="types-place" data-required="true" placeholder="Ex: Boutique" className={INPUT_CLASS} />
                  <datalist id="types-place">
                    {types.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label required>Zone</Label>
                  <input name="zone" list="zones-place" data-required="true" placeholder="Ex: Bloc A" className={INPUT_CLASS} />
                  <datalist id="zones-place">
                    {zones.map((zone) => (
                      <option key={zone} value={zone} />
                    ))}
                  </datalist>
                </div>
              </>
            )}

            <div>
              <Label required>Tarif (FCFA)</Label>
              <input
                key={place?.id || 'nouveau'}
                type="number"
                name="tarif"
                min="0"
                data-required="true"
                defaultValue={place?.tarif}
                placeholder="Ex: 25000"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <Label required>Période</Label>
              <select
                key={place?.id || 'nouveau'}
                name="periode"
                data-required="true"
                defaultValue={PERIODES.some((p) => p.value === place?.periode) ? place?.periode : 'mois'}
                className={`${INPUT_CLASS} cursor-pointer`}
              >
                {PERIODES.map((periode) => (
                  <option key={periode.value} value={periode.value}>{periode.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900">Informations du commerçant</h4>
            </div>
            <div>
              <Label required>Nom complet</Label>
              <input name="nomComplet" data-required="true" placeholder="Ex: Fatou Diallo" className={INPUT_CLASS} />
            </div>
            <div>
              <Label required>Numéro CNI</Label>
              <input name="cni" data-required="true" placeholder="Ex: 1234567890123" maxLength={13} className={INPUT_CLASS} />
            </div>
            <div>
              <Label required>Téléphone</Label>
              <input type="tel" name="telephone" data-required="true" placeholder="Ex: 77 123 45 67" className={INPUT_CLASS} />
            </div>
            <div>
              <Label required>Type d'activité</Label>
              <select name="activite" data-required="true" className={`${INPUT_CLASS} cursor-pointer`}>
                <option value="">Sélectionnez</option>
                {ACTIVITES.map((activite) => (
                  <option key={activite} value={activite}>{activite}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <input name="adresse" placeholder="Ex: Quartier Nord, Kafountine" className={INPUT_CLASS} />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              <i className="ri-error-warning-line mr-2"></i>
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-6 py-3 text-white text-sm font-medium rounded-lg cursor-pointer ${
                submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600 transition-colors'
              }`}
            >
              <i className={`ri-${submitting ? 'loader-4-line animate-spin' : 'check-line'} mr-2`}></i>
              {submitting ? 'Enregistrement...' : 'Attribuer la place'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
