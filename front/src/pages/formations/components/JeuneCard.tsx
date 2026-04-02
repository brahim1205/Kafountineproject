
import { useState } from 'react';
import type { FormationType, JeuneType } from '../page';

interface JeuneCardProps {
  jeune: JeuneType;
  formations: FormationType[];
  onRemove: (jeuneId: string) => void;
}

export default function JeuneCard({ jeune, formations, onRemove }: JeuneCardProps) {
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const formation = formations.find((f) => f.id === jeune.formationId);

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Certifié':
        return 'bg-green-50 text-green-700';
      case 'En cours':
        return 'bg-emerald-50 text-emerald-700';
      case 'Abandon':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  // Guard against missing formation data
  const formationName = formation?.nom ?? 'Formation inconnue';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group relative">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          <img
            src={jeune.photo}
            alt={`${jeune.prenom} ${jeune.nom}`}
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {jeune.prenom} {jeune.nom}
          </h3>
          <p className="text-sm text-gray-600 truncate">{formationName}</p>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 whitespace-nowrap ${getStatutColor(
              jeune.statutFinal
            )}`}
          >
            {jeune.statutFinal}
          </span>
        </div>

        {/* Bouton retirer */}
        <button
          onClick={() => setShowConfirmRemove(true)}
          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
          title="Retirer de la formation"
        >
          <i className="ri-user-unfollow-line text-base"></i>
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <i className="ri-phone-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
          <span className="text-gray-600">{jeune.telephone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <i className="ri-map-pin-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
          <span className="text-gray-600 truncate">{jeune.adresse}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <i className="ri-graduation-cap-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
          <span className="text-gray-600">{jeune.niveauEtude}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200">
      </div>

      {/* Confirmation de retrait */}
      {showConfirmRemove && (
        <div className="absolute inset-0 bg-white/95 rounded-lg flex flex-col items-center justify-center p-4 z-10">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
            <i className="ri-user-unfollow-line text-xl text-red-600"></i>
          </div>
          <p className="text-sm font-medium text-gray-900 text-center mb-1">
            Retirer {jeune.prenom} {jeune.nom} ?
          </p>
          <p className="text-xs text-gray-500 text-center mb-4">
            De la formation : {formation?.nom}
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowConfirmRemove(false)}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                try {
                  setErrorMsg('');
                  onRemove(jeune.id);
                } catch {
                  setErrorMsg("Impossible de retirer ce participant.");
                } finally {
                  setShowConfirmRemove(false);
                }
              }}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm whitespace-nowrap cursor-pointer"
            >
              Retirer
            </button>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
