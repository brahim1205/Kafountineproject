import { clearFieldValidationError } from '../../../utils/formValidation';

type Depense = { service: string; description: string; montant: number };

export default function DepenseModal({ depense, setDepense, onSubmit, onClose }: { depense: Depense; setDepense: (value: Depense) => void; onSubmit: (e: React.FormEvent) => void; onClose: () => void }) {
  return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Demande de Dépense</h3>
                <button 
                  onClick={() => onClose()}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={onSubmit} onInput={clearFieldValidationError} noValidate className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service demandeur</label>
                  <select
                    data-required="true"
                    value={depense.service}
                    onChange={(e) => setDepense({ ...depense, service: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">Sélectionner un service</option>
                    <option value="Urbanisme">Urbanisme</option>
                    <option value="Motos">Motos</option>
                    <option value="Marché">Marché</option>
                    <option value="Formations">Formations</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description de la dépense</label>
                  <textarea
                    data-required="true"
                    rows={3}
                    value={depense.description}
                    onChange={(e) => setDepense({ ...depense, description: e.target.value })}
                    placeholder="Décrire la dépense..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FCFA)</label>
                  <input
                    type="number"
                    data-required="true"
                    min="0"
                    value={depense.montant || ''}
                    onChange={(e) => setDepense({ ...depense, montant: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 150000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => onClose()}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                  >
                    Soumettre la demande
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
  );
}
