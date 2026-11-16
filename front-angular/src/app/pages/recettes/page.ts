import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { RecuPDF } from '../../components/feature/recu-pdf';
import { TransactionStats, UsedCategory } from '../../services/taxes';
import { downloadCsv, today } from '../../utils/csv';
import { getErrorMessage } from '../../utils/form-validation';
import { ModifierTicketModal } from './components/modifier-ticket-modal';
import { RecettesStats } from './components/recettes-stats';
import { RecettesTable } from './components/recettes-table';
import { TicketDetailModal } from './components/ticket-detail-modal';
import { INPUT_CLASS, toRecetteRow, ReceiptData, RecetteRow } from './types';
import { YearService } from '../../core/year/year.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { TaxesApi } from '../../services/taxes';

const PAGE_SIZE = 20;

type ModalState =
  | { type: 'modifier' | 'detail'; row: RecetteRow }
  | { type: 'recu'; receipt: ReceiptData }
  | null;

@Component({
  selector: 'app-recettes',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RecettesStats, RecettesTable, Pagination, ModifierTicketModal, TicketDetailModal, RecuPDF],
  templateUrl: './page.html',
})
export class Recettes {
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly taxesApi = inject(TaxesApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());

  protected readonly role = computed(() => this.auth.role());

  protected readonly canCreate = computed(() => this.isCurrentYear() && (this.role() === 'agent' || this.role() === 'regisseur' || this.role() === 'super_admin'));

  protected readonly canEdit = computed(() => this.role() === 'super_admin' || this.role() === 'regisseur');

  /** L'administration consulte la grille des tarifs depuis ici : « Taxes » n'est plus dans son menu. */
  protected readonly canSeeTarifs = computed(() => this.role() === 'admin' || this.role() === 'super_admin');

  protected readonly canSeeYearStats = computed(() => this.role() === 'admin' || this.role() === 'super_admin' || this.role() === 'service_finances' || this.role() === 'regisseur');

  protected readonly rows = signal<RecetteRow[]>([]);

  protected readonly total = signal(0);

  protected readonly montantPaye = signal(0);

  protected readonly nombrePaye = signal(0);

  protected readonly stats = signal<TransactionStats | null>(null);

  protected readonly categories = signal<UsedCategory[]>([]);

  protected readonly loading = signal(true);

  protected readonly exporting = signal(false);

  protected readonly categorie = signal('');

  protected readonly searchInput = signal('');

  protected readonly search = signal('');

  protected readonly page = signal(1);

  protected readonly refreshKey = signal(0);

  protected readonly modal = signal<ModalState>(null);

  protected requestId = { current: 0 };

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  protected readonly unfiltered = computed(() => !this.categorie() && !this.search());

  protected readonly totals = computed(() => this.unfiltered() && this.stats()?.annee ? { total: this.stats()!.annee.total, count: this.stats()!.annee.transactions } : { total: this.montantPaye(), count: this.nombrePaye() });

  protected toReceipt({ ticketNumber, type, contributor, amount, date, time, agent }: RecetteRow) {
    return ({
    ticketNumber,
    type,
    contributor,
    amount,
    date,
    time,
    agent,
    });
  }

  protected async handleExport() {
    if (!this.canSeeYearStats()) {
    downloadCsv(`recettes_${today()}.csv`, [
    ['N° Ticket', 'Type', 'Contribuable', 'Agent', 'Montant', 'Date', 'Heure'],
    ...this.rows().map((row) => [row.ticketNumber, row.type, row.contributor, row.agent, row.amount, row.date, row.time]),
    ]);
    return;
    }
    try {
    this.exporting.set(true);
    await this.taxesApi.downloadTransactionsCsv({ year: this.selectedYear(), categorie: this.categorie() || undefined, search: this.search() || undefined });
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, "Impossible d'exporter les tickets."), 'error');
    }
    finally {
    this.exporting.set(false);
    }
    }

  protected async reload() {
    return this.refreshKey.update((key) => key + 1);
  }

  protected async afterSave() {
    this.modal.set(null);
    await this.reload();
    }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      this.searchInput();
      const cleanup = untracked(() => (() => {
    const timer = window.setTimeout(() => {
    this.search.set(this.searchInput().trim());
    this.page.set(1);
    }, 350);
    return () => window.clearTimeout(timer);
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.page.set(1);
    this.categorie.set('');
      });
    });
    effect(() => {
      this.selectedYear(); this.refreshKey();
      untracked(() => {
    this.taxesApi.getUsedCategories(this.selectedYear()).then(value => this.categories.set(value)).catch(() => this.categories.set([]));
    if (this.canSeeYearStats()) {
    this.taxesApi.getTransactionStats(this.selectedYear()).then(value => this.stats.set(value)).catch(() => this.stats.set(null));
    }
    else {
    this.stats.set(null);
    }
      });
    });
    effect((onCleanup) => {
      void onCleanup;
      this.selectedYear(); this.categorie(); this.search(); this.page(); this.refreshKey();
      const cleanup = untracked(() => (() => {
    const current = ++this.requestId.current;
    this.loading.set(true);
    this.taxesApi.getTransactions({ page: this.page(), limit: PAGE_SIZE, year: this.selectedYear(), categorie: this.categorie() || undefined, search: this.search() || undefined }).then((result) => {
    if (current !== this.requestId.current)
    return;
    this.rows.set(result.data.map(toRecetteRow));
    this.total.set(result.total);
    this.montantPaye.set(result.montantPaye);
    this.nombrePaye.set(result.nombrePaye);
    })
    .catch(() => {
    if (current !== this.requestId.current)
    return;
    this.rows.set([]);
    this.total.set(0);
    this.montantPaye.set(0);
    this.nombrePaye.set(0);
    this.toast.show('Impossible de charger les recettes.', 'error');
    })
    .finally(() => {
    if (current === this.requestId.current)
    this.loading.set(false);
    });
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
