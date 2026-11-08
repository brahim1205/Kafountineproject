import Modal from '../../../components/feature/Modal';
import type { RecetteRow } from '../types';

type TicketDetailModalProps = {
  row: RecetteRow;
  onClose: () => void;
  onPrint: (row: RecetteRow) => void;
};

export default function TicketDetailModal({ row, onClose, onPrint }: TicketDetailModalProps) {
  const items: Array<[string, string]> = [
    ['N° Ticket', row.ticketNumber],
    ['Type', row.type],
    ['Contribuable', row.contributor],
    ['Agent', row.agent],
    ['Montant', `${row.amount.toLocaleString('fr-FR')} FCFA`],
    ['Date', `${row.date} ${row.time}`],
  ];

  return (
    <Modal
      title="Détails de la transaction"
      size="2xl"
      onClose={onClose}
      footer={
        <button
          onClick={() => onPrint(row)}
          className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <i className="ri-printer-line"></i>
          Imprimer le reçu
        </button>
      }
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
