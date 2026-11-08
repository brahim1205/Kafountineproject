import { LIBELLES_PAIEMENT, formatDate, type UiMotoPayment } from '../types';

type MotoPaymentsTableProps = {
  paiements: UiMotoPayment[];
  canManage: boolean;
  onImprimerRecu: (paiement: UiMotoPayment) => void;
};

const COLUMNS = ['N° Reçu', 'Type', 'Matricule', 'Propriétaire', 'Mois', 'Montant', 'Date', 'Agent'];

export default function MotoPaymentsTable({ paiements, canManage, onImprimerRecu }: MotoPaymentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {COLUMNS.map((column) => (
              <th key={column} className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{column}</th>
            ))}
            {canManage && <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {paiements.map((paiement) => (
            <tr key={paiement.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-sm text-gray-900 font-medium">{paiement.numeroRecu}</td>
              <td className="py-3 px-4 text-sm text-gray-700">{LIBELLES_PAIEMENT[paiement.type || 'COTISATION']}</td>
              <td className="py-3 px-4 text-sm text-gray-900">{paiement.matricule}</td>
              <td className="py-3 px-4 text-sm text-gray-700">{paiement.proprietaire}</td>
              <td className="py-3 px-4 text-sm text-gray-700">{paiement.mois}</td>
              <td className="py-3 px-4 text-sm font-semibold text-emerald-600">{paiement.montant.toLocaleString()} FCFA</td>
              <td className="py-3 px-4 text-sm text-gray-700">{formatDate(paiement.datePaiement, 'N/A')}</td>
              <td className="py-3 px-4 text-sm text-gray-700">{paiement.agent}</td>
              {canManage && (
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => onImprimerRecu(paiement)}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    title="Imprimer le reçu"
                  >
                    <i className="ri-printer-line text-lg"></i>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
