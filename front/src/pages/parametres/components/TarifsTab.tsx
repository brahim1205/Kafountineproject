import type { Tarif } from '../../../services/settings';
import { PRIMARY_BUTTON, SectionHeader } from './ui';

type TarifsTabProps = {
  tarifs: Tarif[];
  onAdd: () => void;
  onEdit: (tarif: Tarif) => void;
  onDelete: (tarif: Tarif) => void;
};

const COLUMNS = ['Catégorie', 'Nom du tarif', 'Montant', 'Unité', 'Statut', 'Actions'];

export default function TarifsTab({ tarifs, onAdd, onEdit, onDelete }: TarifsTabProps) {
  return (
    <div>
      <SectionHeader
        title="Configuration dynamique des tarifs par catégorie"
        action={
          <button onClick={onAdd} className={PRIMARY_BUTTON}>
            <i className="ri-add-line"></i>
            Nouveau tarif
          </button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tarifs.map((tarif) => (
              <tr key={tarif.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{tarif.categorie}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{tarif.nom}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{tarif.montant.toLocaleString()} FCFA</td>
                <td className="px-4 py-3 text-sm text-gray-600">{tarif.unite}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${tarif.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {tarif.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onEdit(tarif)} className="text-teal-600 hover:text-teal-700 mr-3" aria-label={`Modifier ${tarif.nom}`}>
                    <i className="ri-edit-line"></i>
                  </button>
                  <button onClick={() => onDelete(tarif)} className="text-red-600 hover:text-red-700" aria-label={`Supprimer ${tarif.nom}`}>
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </td>
              </tr>
            ))}
            {tarifs.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-gray-500">Aucun tarif configuré.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
