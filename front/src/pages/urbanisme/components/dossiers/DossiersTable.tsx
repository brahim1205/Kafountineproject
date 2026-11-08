import type { DossierUrbanisme } from '../../../../services/urbanisme';
import type { TaxService } from '../../../../services/taxes';
import { formatDate, formatSurface, statut, typeLabel } from './dossiers';

type DossiersTableProps = {
  dossiers: DossierUrbanisme[];
  types: TaxService[];
  loading: boolean;
  onView: (dossier: DossierUrbanisme) => void;
};

const COLUMNS = ['Numéro', 'Date', 'Demandeur', 'Type', 'Localisation', 'Surface', 'Montant', 'Statut'];

export default function DossiersTable({ dossiers, types, loading, onView }: DossiersTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">{column}</th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading || dossiers.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-gray-500">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <i className="ri-loader-4-line animate-spin text-emerald-500"></i>
                      Chargement des dossiers...
                    </span>
                  ) : (
                    'Aucun dossier trouvé'
                  )}
                </td>
              </tr>
            ) : (
              dossiers.map((dossier) => {
                const { label, badge } = statut(dossier.statut);
                const demandeur = dossier.contribuable ? `${dossier.contribuable.prenom} ${dossier.contribuable.nom}` : '-';
                return (
                  <tr key={dossier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{dossier.numero}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(dossier.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{demandeur}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{typeLabel(dossier, types)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dossier.localisation || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatSurface(dossier.surface)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600 whitespace-nowrap">{dossier.montant.toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge}`}>{label}</span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => onView(dossier)}
                        className="w-8 h-8 inline-flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Voir les détails"
                        aria-label={`Détails du dossier ${dossier.numero}`}
                      >
                        <i className="ri-eye-line"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
