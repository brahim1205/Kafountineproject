import type { TransactionItem } from '../../services/taxes';

export type ReceiptData = {
  ticketNumber: string;
  type: string;
  contributor: string;
  amount: number;
  date: string;
  time: string;
  agent: string;
};

export type RecetteRow = ReceiptData & {
  id: string;
  contribuableId: string;
  contribuableNin: string;
  statut: string;
};

export const INPUT_CLASS =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm';

export const formatDate = (date: Date) => date.toLocaleDateString('fr-FR');
export const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const fullName = (person?: { prenom?: string; nom?: string } | null) => `${person?.prenom || ''} ${person?.nom || ''}`.trim();

export function toRecetteRow(item: TransactionItem): RecetteRow {
  const date = item.date ? new Date(item.date) : new Date();
  return {
    id: item.id,
    ticketNumber: item.numero,
    type: item.service || item.categorie,
    contributor: fullName(item.contribuable) || '-',
    agent: fullName(item.agent) || 'Agent Municipal',
    amount: Number(item.montant || 0),
    date: formatDate(date),
    time: formatTime(date),
    contribuableId: item.contribuable?.id || '',
    contribuableNin: item.contribuable?.nin || '',
    statut: item.statut || 'PAYE',
  };
}
