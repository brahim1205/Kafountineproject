import { clearFieldValidationError } from '../../../utils/formValidation';

type Ligne = { code: string; libelle: string; prevu: number };

export default function LigneBudgetModal({ ligne, setLigne, onSubmit, onClose }: { ligne: Ligne; setLigne: (value: Ligne) => void; onSubmit: (e: React.FormEvent) => void; onClose: () => void }) {
  return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Ligne Budgétaire</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code budgétaire</label>
                  <input
                    type="text"
                    data-required="true"
                    value={ligne.code}
                    onChange={(e) => setLigne({ ...ligne, code: e.target.value })}
                    placeholder="Ex: 601"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Libellé</label>
                  <input
                    type="text"
                    data-required="true"
                    value={ligne.libelle}
                    onChange={(e) => setLigne({ ...ligne, libelle: e.target.value })}
                    placeholder="Ex: Salaires & Indemnités"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant prévu (FCFA)</label>
                  <input
                    type="number"
                    data-required="true"
                    min="0"
                    value={ligne.prevu || ''}
                    onChange={(e) => setLigne({ ...ligne, prevu: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 5000000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
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
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
  );
}
