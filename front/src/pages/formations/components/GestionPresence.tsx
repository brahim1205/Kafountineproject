import { useState } from 'react';

interface Formation {
  id: string;
  nom: string;
}

interface Jeune {
  id: string;
  formationId: string;
  nom: string;
  prenom: string;
  photo: string;
  tauxAssiduite: number;
}

interface GestionPresenceProps {
  formationId: string;
  formations: Formation[];
  jeunes: Jeune[];
  onClose: () => void;
}

export default function GestionPresence({ formationId, formations, jeunes, onClose }: GestionPresenceProps) {
  const formation = formations.find(f => f.id === formationId);
  const jeunesFormation = jeunes.filter(j => j.formationId === formationId);
  const [datePresence, setDatePresence] = useState(new Date().toISOString().split('T')[0]);
  const [presences, setPresences] = useState<Record<string, boolean>>(
    Object.fromEntries(jeunesFormation.map(j => [j.id, true]))
  );

  const handleTogglePresence = (jeuneId: string) => {
    setPresences(prev => ({ ...prev, [jeuneId]: !prev[jeuneId] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  const nombrePresents = Object.values(presences).filter(p => p).length;
  const nombreAbsents = jeunesFormation.length - nombrePresents;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/50 z-50" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gestion des présences</h2>
                <p className="text-sm text-gray-600 mt-1">{formation?.nom}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de présence
                </label>
                <input
                  type="date"
                  value={datePresence}
                  onChange={(e) => setDatePresence(e.target.value)}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-700 mb-1">Présents</p>
                  <p className="text-2xl font-bold text-green-600">{nombrePresents}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-700 mb-1">Absents</p>
                  <p className="text-2xl font-bold text-red-600">{nombreAbsents}</p>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
                {jeunesFormation.map(jeune => (
                  <div
                    key={jeune.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                      presences[jeune.id]
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                    onClick={() => handleTogglePresence(jeune.id)}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={jeune.photo}
                        alt={`${jeune.prenom} ${jeune.nom}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {jeune.prenom} {jeune.nom}
                      </p>
                      <p className="text-sm text-gray-600">Assiduité : {jeune.tauxAssiduite}%</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      presences[jeune.id] ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <i className={`${
                        presences[jeune.id] ? 'ri-check-line' : 'ri-close-line'
                      } text-white text-xl`}></i>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  Enregistrer les présences
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
