import { type Embarcation } from '../../../../services/quai-peche';

export default function EmbarcationDetailModal({ item, onClose }: { item: Embarcation; onClose: () => void }) {
  return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Détails de l'Embarcation</h3>
                <button onClick={() => onClose()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Nom:</span><span className="font-medium">{item.nom}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Immatriculation:</span><span className="font-medium font-mono">{item.immatriculation}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type:</span><span className="font-medium">{item.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Taille:</span><span className="font-medium">{item.taille ? `${item.taille} m` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Moteur:</span><span className="font-medium">{item.moteur || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Propriétaire:</span><span className="font-medium">{item.pecheur ? `${item.pecheur.prenom} ${item.pecheur.nom}` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Statut:</span><span className="font-medium">{item.statut}</span></div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button onClick={() => onClose()} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Fermer
              </button>
            </div>
          </div>
        </div>
  );
}
