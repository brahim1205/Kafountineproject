import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../components/feature/DashboardLayout';
import Pagination from '../../components/feature/Pagination';
import RecuPDF from '../../components/feature/RecuPDF';
import { useToast } from '../../components/feature/Toast';
import { useYear } from '../../contexts/YearContext';
import { getStoredUserRole } from '../../services/auth';
import {
  downloadTransactionsCsv,
  getTransactionStats,
  getTransactions,
  getUsedCategories,
  type TransactionStats,
  type UsedCategory,
} from '../../services/taxes';
import { downloadCsv, today } from '../../utils/csv';
import { getErrorMessage } from '../../utils/formValidation';
import ModifierTicketModal from './components/ModifierTicketModal';
import NouveauTicketModal from './components/NouveauTicketModal';
import RecettesStats from './components/RecettesStats';
import RecettesTable from './components/RecettesTable';
import TicketDetailModal from './components/TicketDetailModal';
import { INPUT_CLASS, toRecetteRow, type ReceiptData, type RecetteRow } from './types';

/** Tickets par page : la liste est paginée côté serveur, quel que soit le nombre de tickets de l'année. */
const PAGE_SIZE = 50;

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
  // Statistiques de l'année et export complet : réservés par l'API à l'encadrement et aux finances.
  const canSeeYearStats = canEdit || role === 'comptable' || role === 'service_finances';

  const [rows, setRows] = useState<RecetteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [montantPaye, setMontantPaye] = useState(0);
  const [nombrePaye, setNombrePaye] = useState(0);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [categories, setCategories] = useState<UsedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [categorie, setCategorie] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const requestId = useRef(0);

  // Recherche appliquée après une courte pause de frappe, en repartant de la première page.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setCategorie('');
  }, [selectedYear]);

  useEffect(() => {
    getUsedCategories(selectedYear).then(setCategories).catch(() => setCategories([]));
    if (canSeeYearStats) {
      getTransactionStats(selectedYear).then(setStats).catch(() => setStats(null));
    } else {
      setStats(null);
    }
  }, [selectedYear, refreshKey]);

  useEffect(() => {
    const current = ++requestId.current;
    setLoading(true);
    getTransactions({ page, limit: PAGE_SIZE, year: selectedYear, categorie: categorie || undefined, search: search || undefined })
      .then((result) => {
        if (current !== requestId.current) return;
        setRows(result.data.map(toRecetteRow));
        setTotal(result.total);
        setMontantPaye(result.montantPaye);
        setNombrePaye(result.nombrePaye);
      })
      .catch(() => {
        if (current !== requestId.current) return;
        setRows([]);
        setTotal(0);
        setMontantPaye(0);
        setNombrePaye(0);
        showToast('Impossible de charger les recettes.', 'error');
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
  }, [selectedYear, categorie, search, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const unfiltered = !categorie && !search;
  // Tickets encaissés : statistiques de l'année sans filtre, sinon totaux de la sélection calculés par le serveur.
  const totals = unfiltered && stats?.annee ? { total: stats.annee.total, count: stats.annee.transactions } : { total: montantPaye, count: nombrePaye };

  const toReceipt = ({ ticketNumber, type, contributor, amount, date, time, agent }: RecetteRow): ReceiptData => ({
    ticketNumber,
    type,
    contributor,
    amount,
    date,
    time,
    agent,
  });

  const handleExport = async () => {
    if (!canSeeYearStats) {
      // Sans droit d'export complet : la page affichée.
      downloadCsv(`recettes_${today()}.csv`, [
        ['N° Ticket', 'Type', 'Contribuable', 'Agent', 'Montant', 'Date', 'Heure'],
        ...rows.map((row) => [row.ticketNumber, row.type, row.contributor, row.agent, row.amount, row.date, row.time]),
      ]);
      return;
    }
    try {
      setExporting(true);
      await downloadTransactionsCsv({ year: selectedYear, categorie: categorie || undefined, search: search || undefined });
    } catch (error) {
      showToast(getErrorMessage(error, "Impossible d'exporter les tickets."), 'error');
    } finally {
      setExporting(false);
    }
  };

  const reload = async () => setRefreshKey((key) => key + 1);
  const afterSave = async () => {
    setModal(null);
    await reload();
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="recherche-ticket" className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher
              </label>
              <input
                id="recherche-ticket"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="N° de ticket, contribuable, NIN, service"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="filtre-type" className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie
              </label>
              <select
                id="filtre-type"
                value={categorie}
                onChange={(e) => {
                  setCategorie(e.target.value);
                  setPage(1);
                }}
                className={`${INPUT_CLASS} cursor-pointer`}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((item) => (
                  <option key={item.valeur} value={item.valeur}>
                    {item.libelle} — {item.nombre.toLocaleString('fr-FR')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={exporting || total === 0}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <i className={exporting ? 'ri-loader-4-line animate-spin' : 'ri-download-line'}></i>
                {exporting ? 'Export en cours...' : canSeeYearStats ? 'Exporter la sélection' : 'Exporter la page'}
              </button>
            </div>
          </div>
        </div>

        <RecettesTable
          rows={rows}
          loading={loading}
          canEdit={canEdit}
          onEdit={(row) => setModal({ type: 'modifier', row })}
          onPrint={(row) => setModal({ type: 'recu', receipt: toReceipt(row) })}
          onView={(row) => setModal({ type: 'detail', row })}
          footer={!loading && total > 0 ? <Pagination page={page} totalPages={totalPages} total={total} unit="ticket" onChange={setPage} /> : null}
        />
      </div>

      {modal?.type === 'nouveau' && (
        <NouveauTicketModal onClose={() => setModal(null)} onSaved={reload} onPrint={(receipt) => setModal({ type: 'recu', receipt })} />
      )}
      {modal?.type === 'modifier' && <ModifierTicketModal row={modal.row} onClose={() => setModal(null)} onSaved={afterSave} />}
      {modal?.type === 'detail' && (
        <TicketDetailModal row={modal.row} onClose={() => setModal(null)} onPrint={(row) => setModal({ type: 'recu', receipt: toReceipt(row) })} />
      )}
      {modal?.type === 'recu' && <RecuPDF {...modal.receipt} onClose={() => setModal(null)} />}
    </DashboardLayout>
  );
}
