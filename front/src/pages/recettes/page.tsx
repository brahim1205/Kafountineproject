import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import RecuPDF from '../../components/feature/RecuPDF';
import { listContribuables, type Contribuable } from '../../services/contribuables';
import { createTransaction, getTransactions, type TransactionItem } from '../../services/taxes';
import { getStoredUserName, getStoredUserRole } from '../../services/auth';
import { useYear } from '../../contexts/YearContext';
import { useToast } from '../../components/feature/Toast';
import {
  clearFieldValidationError,
  getErrorMessage,
  validateFormElement,
} from '../../utils/formValidation';

type RecetteRow = {
  id: string;
  ticketNumber: string;
  type: string;
  contributor: string;
  agent: string;
  amount: number;
  date: string;
  time: string;
  contribuableId: string;
};

type ReceiptData = {
  ticketNumber: string;
  type: string;
  contributor: string;
  amount: number;
  date: string;
  time: string;
  agent: string;
};

export default function Recettes() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const userRole = getStoredUserRole() || 'admin';
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecu, setSelectedRecu] = useState<RecetteRow | ReceiptData | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<RecetteRow | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [newTicketData, setNewTicketData] = useState<ReceiptData | null>(null);
  const [rows, setRows] = useState<RecetteRow[]>([]);
  const [contribuables, setContribuables] = useState<Contribuable[]>([]);

  const loadData = async () => {
    try {
      const [txs, contribs] = await Promise.all([getTransactions({ page: 1, limit: 500, year: selectedYear }), listContribuables({ limit: 500 })]);
      const mapped = (txs.data || []).map((item: TransactionItem): RecetteRow => {
        const dt = item.date ? new Date(item.date) : new Date();
        return {
          id: item.id,
          ticketNumber: item.numero,
          type: item.service || item.categorie,
          contributor: `${item.contribuable?.prenom || ''} ${item.contribuable?.nom || ''}`.trim() || '-',
          agent: `${item.agent?.prenom || ''} ${item.agent?.nom || ''}`.trim() || 'Agent Municipal',
          amount: Number(item.montant || 0),
          date: dt.toLocaleDateString('fr-FR'),
          time: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          contribuableId: item.contribuable?.id || '',
        };
      });
      setRows(mapped);
      setContribuables(contribs || []);
    } catch {
      setRows([]);
      setContribuables([]);
      showToast('Impossible de charger les recettes.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const filteredData = useMemo(() => {
    if (filterType === 'all') return rows;
    return rows.filter((item) => item.type === filterType);
  }, [rows, filterType]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const handlePrintRecu = (item: RecetteRow) => {
    setSelectedRecu(item);
    setShowRecuModal(true);
  };

  const handleViewTransaction = (item: RecetteRow) => {
    setSelectedTransaction(item);
    setShowViewModal(true);
  };

  const handleExport = () => {
    const csvContent = [
      ['N° Ticket', 'Type', 'Contribuable', 'Agent', 'Montant', 'Date', 'Heure'].join(','),
      ...filteredData.map((item) => [item.ticketNumber, item.type, item.contributor, item.agent, item.amount, item.date, item.time].join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recettes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSubmitTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget)) {
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);
    const reference = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const contributorId = String(formData.get('contributorId') || '');
    const type = String(formData.get('type') || '');
    const amount = Number(formData.get('amount') || 0);

    try {
      const created = await createTransaction({
        contribuableId: contributorId,
        type,
        service: type,
        quantite: 1,
        montant: amount,
        modePaiement: 'ESPECE',
        reference,
      });

      const now = new Date();
      const contrib = contribuables.find((c) => c.id === contributorId);
      const newTicket: ReceiptData = {
        ticketNumber: created?.numero || reference,
        type,
        contributor: `${contrib?.prenom || ''} ${contrib?.nom || ''}`.trim() || '-',
        amount,
        date: now.toLocaleDateString('fr-FR'),
        time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        agent: getStoredUserName() || 'Agent Municipal',
      };

      setNewTicketData(newTicket);
      setTicketSubmitted(true);
      await loadData();
    } catch (error) {
      showToast(getErrorMessage(error, "Impossible d'enregistrer le ticket."), 'error');
    }
  };

  const handleGenerateRecuAfterSubmit = () => {
    setShowNewTicketModal(false);
    setTicketSubmitted(false);
    setSelectedRecu(newTicketData);
    setShowRecuModal(true);
    setNewTicketData(null);
  };

  const typeOptions = Array.from(new Set(rows.map((r) => r.type).filter(Boolean)));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des recettes</h1>
            <p className="text-sm text-gray-600 mt-1">Enregistrement et suivi des paiements</p>
          </div>
          {(userRole === 'agent' || userRole === 'admin') && isCurrentYear && (
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-add-line text-lg"></i>
              Nouveau ticket
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalAmount.toLocaleString()}</h3>
            <p className="text-xs text-gray-500 mt-1">FCFA</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Transactions</p>
            <h3 className="text-2xl font-bold text-gray-900">{filteredData.length}</h3>
            <p className="text-xs text-gray-500 mt-1">tickets émis</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Montant moyen</p>
            <h3 className="text-2xl font-bold text-gray-900">{filteredData.length ? Math.round(totalAmount / filteredData.length).toLocaleString() : '0'}</h3>
            <p className="text-xs text-gray-500 mt-1">FCFA</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de taxe</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm cursor-pointer"
              >
                <option value="all">Tous les types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExport}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-download-line"></i>
                Exporter
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">N° Ticket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Contribuable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Date & Heure</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.ticketNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.contributor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.agent}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.amount.toLocaleString()} FCFA</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{item.date}</p>
                      <p className="text-xs text-gray-500">{item.time}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePrintRecu(item)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <i className="ri-printer-line text-lg"></i>
                        </button>
                        <button
                          onClick={() => handleViewTransaction(item)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <i className="ri-eye-line text-lg"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showNewTicketModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Nouveau ticket de paiement</h2>
                <button
                  onClick={() => {
                    setShowNewTicketModal(false);
                    setTicketSubmitted(false);
                    setNewTicketData(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6">
              {!ticketSubmitted ? (
                <form onSubmit={handleSubmitTicket} onInput={clearFieldValidationError} noValidate className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de taxe</label>
                    <input
                      name="type"
                      data-required="true"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                      placeholder="Ex: Ticket journalier"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contribuable</label>
                    <select
                      name="contributorId"
                      data-required="true"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm cursor-pointer"
                    >
                      <option value="">Sélectionner un contribuable</option>
                      {contribuables.map((c) => (
                        <option key={c.id} value={c.id}>
                          {`${c.prenom || ''} ${c.nom || ''}`.trim()} ({c.nin})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FCFA)</label>
                    <input
                      type="number"
                      name="amount"
                      data-required="true"
                      min="1"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowNewTicketModal(false)}
                      className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <i className="ri-check-line"></i>
                      Enregistrer le ticket
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-check-line text-3xl text-green-600"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ticket enregistré avec succès !</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Numéro de ticket : <strong>{newTicketData?.ticketNumber}</strong>
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setShowNewTicketModal(false);
                        setTicketSubmitted(false);
                        setNewTicketData(null);
                      }}
                      className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={handleGenerateRecuAfterSubmit}
                      className="px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <i className="ri-printer-line"></i>
                      Générer le reçu
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Détails de la transaction</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTransaction(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p><strong>N° Ticket:</strong> {selectedTransaction.ticketNumber}</p>
              <p><strong>Type:</strong> {selectedTransaction.type}</p>
              <p><strong>Contribuable:</strong> {selectedTransaction.contributor}</p>
              <p><strong>Agent:</strong> {selectedTransaction.agent}</p>
              <p><strong>Montant:</strong> {selectedTransaction.amount.toLocaleString()} FCFA</p>
              <p><strong>Date:</strong> {selectedTransaction.date} {selectedTransaction.time}</p>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedRecu(selectedTransaction);
                    setShowRecuModal(true);
                  }}
                  className="px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-printer-line"></i>
                  Imprimer le reçu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecuModal && selectedRecu && (
        <RecuPDF
          ticketNumber={selectedRecu.ticketNumber}
          date={selectedRecu.date}
          time={selectedRecu.time}
          contributor={selectedRecu.contributor}
          type={selectedRecu.type}
          amount={selectedRecu.amount}
          agent={selectedRecu.agent}
          onClose={() => {
            setShowRecuModal(false);
            setSelectedRecu(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
