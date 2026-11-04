import type { ReactNode } from 'react';
import type { RecetteRow } from '../types';

type RecettesTableProps = {
  rows: RecetteRow[];
  loading: boolean;
  /** Admins : modification ; autres rôles : impression directe du reçu. */
  canEdit: boolean;
  onEdit: (row: RecetteRow) => void;
  onPrint: (row: RecetteRow) => void;
  onView: (row: RecetteRow) => void;
  /** Pied de tableau (pagination). */
  footer?: ReactNode;
};

const HEADERS = ['N° Ticket', 'Type', 'Contribuable', 'Agent', 'Montant', 'Date & Heure'];
const ACTION_CLASS = 'w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer';

export default function RecettesTable({ rows, loading, canEdit, onEdit, onPrint, onView, footer }: RecettesTableProps) {
  const message = loading ? 'Chargement des recettes...' : rows.length === 0 ? 'Aucune recette pour cette sélection.' : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {HEADERS.map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                  {header}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {message ? (
              <tr>
                <td colSpan={HEADERS.length + 1} className="px-6 py-8 text-center text-sm text-gray-500">
                  {message}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.ticketNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.contributor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.agent}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{row.amount.toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{row.date}</p>
                    <p className="text-xs text-gray-500">{row.time}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit ? (
                        <button onClick={() => onEdit(row)} className={ACTION_CLASS} title="Modifier" aria-label={`Modifier le ticket ${row.ticketNumber}`}>
                          <i className="ri-edit-line text-lg"></i>
                        </button>
                      ) : (
                        <button onClick={() => onPrint(row)} className={ACTION_CLASS} title="Imprimer" aria-label={`Imprimer le reçu ${row.ticketNumber}`}>
                          <i className="ri-printer-line text-lg"></i>
                        </button>
                      )}
                      <button onClick={() => onView(row)} className={ACTION_CLASS} title="Voir" aria-label={`Détails du ticket ${row.ticketNumber}`}>
                        <i className="ri-eye-line text-lg"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
