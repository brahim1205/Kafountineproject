import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import RecuPDF from '../../components/feature/RecuPDF';
import { useToast } from '../../components/feature/Toast';
import { useYear } from '../../contexts/YearContext';
import { getStoredUserRole } from '../../services/auth';
import { getTransactionStats, getTransactions, type TransactionStats } from '../../services/taxes';
import { downloadCsv, today } from '../../utils/csv';
import ModifierTicketModal from './components/ModifierTicketModal';
import NouveauTicketModal from './components/NouveauTicketModal';
import RecettesStats from './components/RecettesStats';
import RecettesTable from './components/RecettesTable';
import TicketDetailModal from './components/TicketDetailModal';
import { toRecetteRow, type ReceiptData, type RecetteRow } from './types';

/** Plafond de l'API par requête : au-delà, la liste n'affiche que les transactions les plus récentes. */
const PAGE_LIMIT = 300;

type ModalState =
  | { type: 'nouveau' }
  | { type: 'modifier' | 'detail'; row: RecetteRow }
  | { type: 'recu'; receipt: ReceiptData }
  | null;

export default function Recettes() {
  const { selectedYear } = useYear();
  const { showToast } = useToast();
  const isCurrentYear = selectedYear === new Date().getFullYear();
  const role = getStoredUserRole();
  const canCreate = isCurrentYear && (role === 'agent' || role === 'admin');
  // Même règle que l'API : seuls les admins modifient ou suppriment une transaction.
  const canEdit = role === 'admin' || role === 'super_admin';

  const [rows, setRows] = useState<RecetteRow[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [modal, setModal] = useState<ModalState>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transactions, yearStats] = await Promise.all([
        getTransactions({ page: 1, limit: PAGE_LIMIT, year: selectedYear }),
        getTransactionStats(selectedYear).catch(() => null),
      ]);
      setRows((transactions.data || []).map(toRecetteRow));
      setStats(yearStats);
    } catch {
      setRows([]);
      setStats(null);
      showToast('Impossible de charger les recettes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const filteredRows = useMemo(() => (filterType === 'all' ? rows : rows.filter((row) => row.type === filterType)), [rows, filterType]);
  const typeOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.type).filter(Boolean))), [rows]);
  const truncated = rows.length >= PAGE_LIMIT;

  // Sans filtre, les totaux viennent des statistiques de l'année entière, pas des seules lignes chargées.
  const yearTotals = filterType === 'all' && stats ? { total: stats.annee.total, count: stats.annee.transactions } : null;
  const totals = yearTotals ?? { total: filteredRows.reduce((sum, row) => sum + row.amount, 0), count: filteredRows.length };

  const toReceipt = ({ ticketNumber, type, contributor, amount, date, time, agent }: RecetteRow): ReceiptData => ({
    ticketNumber,
    type,
    contributor,
    amount,
    date,
    time,
    agent,
  });

  const handleExport = () => {
    downloadCsv(`recettes_${today()}.csv`, [
      ['N° Ticket', 'Type', 'Contribuable', 'Agent', 'Montant', 'Date', 'Heure'],
      ...filteredRows.map((row) => [row.ticketNumber, row.type, row.contributor, row.agent, row.amount, row.date, row.time]),
    ]);
  };

  const afterSave = async () => {
    setModal(null);
    await loadData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des recettes</h1>
            <p className="text-sm text-gray-600 mt-1">Enregistrement et suivi des paiements</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setModal({ type: 'nouveau' })}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-add-line text-lg"></i>
              Nouveau ticket
            </button>
          )}
        </div>

        <RecettesStats total={totals.total} count={totals.count} />

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filtre-type" className="block text-sm font-medium text-gray-700 mb-2">
                Type de taxe
              </label>
              <select
                id="filtre-type"
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
          {truncated && (
            <p className="mt-4 text-xs text-amber-700">
              Seules les {PAGE_LIMIT} transactions les plus récentes de l'année sont listées
              {filterType === 'all' ? ' ; les totaux ci-dessus portent sur toute l’année.' : ' : les totaux filtrés portent sur ces transactions.'}
            </p>
          )}
        </div>

        <RecettesTable
          rows={filteredRows}
          loading={loading}
          canEdit={canEdit}
          onEdit={(row) => setModal({ type: 'modifier', row })}
          onPrint={(row) => setModal({ type: 'recu', receipt: toReceipt(row) })}
          onView={(row) => setModal({ type: 'detail', row })}
        />
      </div>

      {modal?.type === 'nouveau' && (
        <NouveauTicketModal onClose={() => setModal(null)} onSaved={loadData} onPrint={(receipt) => setModal({ type: 'recu', receipt })} />
      )}
      {modal?.type === 'modifier' && <ModifierTicketModal row={modal.row} onClose={() => setModal(null)} onSaved={afterSave} />}
      {modal?.type === 'detail' && (
        <TicketDetailModal row={modal.row} onClose={() => setModal(null)} onPrint={(row) => setModal({ type: 'recu', receipt: toReceipt(row) })} />
      )}
      {modal?.type === 'recu' && <RecuPDF {...modal.receipt} onClose={() => setModal(null)} />}
    </DashboardLayout>
  );
}
