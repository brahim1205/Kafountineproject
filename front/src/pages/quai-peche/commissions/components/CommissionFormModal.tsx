import { type Pecheur } from '../../../../services/quai-peche';
import { clearFieldValidationError } from '../../../../utils/formValidation';

export type CommissionFormData = { pecheurId: string; poids: string; typePoisson: string; temperatura: string; observations: string };

export default function CommissionFormModal({ formData, setFormData, onSubmit, onClose, pecheurs }: { formData: CommissionFormData; setFormData: (value: CommissionFormData) => void; onSubmit: (e: React.FormEvent) => void; onClose: () => void; pecheurs: Pecheur[] }) {
  return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Commission Frigorifique</h3>
                <button onClick={() => onClose()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <form onSubmit={onSubmit} onInput={clearFieldValidationError} noValidate>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pêcheur *</label>
                  <select
                    data-required="true"
                    value={formData.pecheurId}
                    onChange={(e) => setFormData({ ...formData, pecheurId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner un pêcheur</option>
                    {pecheurs.map(p => (
                      <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg) *</label>
                    <input
                      data-required="true"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Ex: 150"
                      value={formData.poids}
                      onChange={(e) => setFormData({ ...formData, poids: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de Poisson *</label>
                    <select
                      data-required="true"
                      value={formData.typePoisson}
                      onChange={(e) => setFormData({ ...formData, typePoisson: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Maquereau">Maquereau</option>
                      <option value="Sardine">Sardine</option>
                      <option value="Thon">Thon</option>
                      <option value="Dorade">Dorade</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Température (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: -5"
                      value={formData.temperatura}
                      onChange={(e) => setFormData({ ...formData, temperatura: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                  <textarea
                    rows={3}
                    placeholder="Observations..."
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => onClose()} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
