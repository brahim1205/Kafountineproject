import { useState } from 'react';
import { updatePlaceMarche } from '../../../../services/marche';
import type { UiPlace } from './places';

type ResiliationModalProps = {
  place: UiPlace;
  onClose: () => void;
  onDone: () => Promise<void>;
};

export default function ResiliationModal({ place, onClose, onDone }: ResiliationModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const confirmer = async () => {
    setSubmitting(true);
    setError('');
    try {
      await updatePlaceMarche(place.id, { occupantId: null, statut: 'LIBRE' });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de résilier l’attribution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <i className="ri-alert-line text-2xl text-red-600"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Confirmer la résiliation</h3>
        <p className="text-sm text-gray-600 text-center mb-6">
          Êtes-vous sûr de vouloir résilier l'attribution de la place <strong>{place.numero}</strong> occupée par{' '}
          <strong>{place.occupant || 'un commerçant'}</strong> ? La place redeviendra disponible.
        </p>
        {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={confirmer}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Résiliation...' : 'Résilier'}
          </button>
        </div>
      </div>
    </div>
  );
}
