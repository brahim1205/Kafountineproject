import Modal from '../../../components/feature/Modal';
import { tauxRealisation, type LigneBudgetaire } from '../../../services/budget';

export default function LigneDetailModal({ ligne, onClose }: { ligne: LigneBudgetaire; onClose: () => void }) {
  const reste = ligne.prevu - ligne.depense;
  const realise = tauxRealisation(ligne);
  const items: Array<[string, string, string]> = [
    ['Code', ligne.code, 'text-gray-900'],
    ['Catégorie', ligne.libelle, 'text-gray-900'],
    ['Budgétisé', `${ligne.prevu.toLocaleString('fr-FR')} FCFA`, 'text-gray-900'],
    ['Dépensé', `${ligne.depense.toLocaleString('fr-FR')} FCFA`, 'text-gray-900'],
    ['Reste', `${reste.toLocaleString('fr-FR')} FCFA`, reste >= 0 ? 'text-green-600' : 'text-red-600'],
    ['Réalisation', `${realise}%`, realise > 100 ? 'text-red-600' : 'text-teal-600'],
  ];

  return (
    <Modal
      title="Détails de la Ligne Budgétaire"
      onClose={onClose}
      footer={
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Fermer
        </button>
      }
    >
      <dl className="grid grid-cols-2 gap-4">
        {items.map(([label, value, tone]) => (
          <div key={label}>
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className={`font-medium ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {ligne.description && <p className="text-sm text-gray-600">{ligne.description}</p>}
    </Modal>
  );
}
