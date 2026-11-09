import { type Pecheur } from '../../../../services/quai-peche';
import { clearFieldValidationError } from '../../../../utils/formValidation';

export type EmbarcationFormData = { nom: string; immatriculation: string; type: string; taille: string; moteur: string; pecheurId: string };

export default function EmbarcationFormModal({ title, formData, setFormData, onSubmit, onClose, pecheurs }: { title: string; formData: EmbarcationFormData; setFormData: (value: EmbarcationFormData) => void; onSubmit: (e: React.FormEvent) => void; onClose: () => void; pecheurs: Pecheur[] }) {
  return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <button onClick={() => onClose()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <form onSubmit={onSubmit} onInput={clearFieldValidationError} noValidate>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      data-required="true"
                      type="text"
                      placeholder="Ex: Bateau A"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation *</label>
                    <input
                      data-required="true"
                      type="text"
                      placeholder="Ex: KP-001"
                      value={formData.immatriculation}
                      onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      data-required="true"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Pirogue">Pirogue</option>
                      <option value="Canot">Canot</option>
                      <option value="Chalutier">Chalutier</option>
                      <option value="Senneur">Senneur</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taille (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Ex: 12"
                      value={formData.taille}
                      onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moteur</label>
                    <input
                      type="text"
                      placeholder="Ex: Yamaha 40 CV"
                      value={formData.moteur}
                      onChange={(e) => setFormData({ ...formData, moteur: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
                    <select
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
