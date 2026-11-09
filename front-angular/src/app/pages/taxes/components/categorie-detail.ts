import { ChangeDetectionStrategy, Component, inject, input, signal, computed, effect, untracked } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { TaxCategory, TransactionItem, TaxService } from '../../../services/taxes';
import { RecuPDF } from '../../../components/feature/recu-pdf';
import { YearService } from '../../../core/year/year.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TaxesApi } from '../../../services/taxes';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-categorie-detail',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination, RecuPDF],
  templateUrl: './categorie-detail.html',
})
export class CategorieDetail {
  protected readonly yearService = inject(YearService);
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly taxesApi = inject(TaxesApi);
  readonly categorieId = input<string>();

  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly userRole = computed(() => this.auth.role() || 'admin');

  protected readonly searchTerm = signal('');

  protected readonly search = signal('');

  protected readonly dateDebut = signal('');

  protected readonly dateFin = signal('');

  protected readonly page = signal(1);

  protected readonly showRecuPDF = signal(false);

  protected readonly showDetailModal = signal(false);

  protected readonly selectedTransaction = signal<TransactionItem | null>(null);

  protected readonly categories = signal<TaxCategory[]>([]);

  protected readonly services = signal<TaxService[]>([]);

  protected readonly transactions = signal<TransactionItem[]>([]);

  protected readonly total = signal(0);

  protected readonly totalRecettes = signal(0);

  protected readonly loading = signal(true);

  protected readonly listLoading = signal(true);

  protected readonly errorMsg = signal('');

  protected requestId = { current: 0 };

  protected readonly categorie = computed(() => this.categories().find(c => c.id === this.categorieId()));

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  protected handleVoirRecu(transaction: TransactionItem) {
    this.selectedTransaction.set(transaction);
    this.showRecuPDF.set(true);
    }

  protected handleVoirDetail(transaction: TransactionItem) {
    this.selectedTransaction.set(transaction);
    this.showDetailModal.set(true);
    }

  protected formatToLocaleDateString(transaction: TransactionItem) {
    return transaction.date ? new Date(transaction.date).toLocaleDateString('fr-FR') : '-';
  }

  protected formatToLocaleTimeString(transaction: TransactionItem) {
    return transaction.date ? new Date(transaction.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
  }

  protected formatSelectedTransaction() {
    return {
    numero: this.selectedTransaction()!.numero,
    date: this.selectedTransaction()!.date,
    heure: this.selectedTransaction()!.heure || (this.selectedTransaction()!.date ? new Date(this.selectedTransaction()!.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''),
    contribuable: `${this.selectedTransaction()!.contribuable?.prenom || ''} ${this.selectedTransaction()!.contribuable?.nom || ''}`.trim() || '-',
    type: this.selectedTransaction()!.service,
    montant: this.selectedTransaction()!.montant,
    agent: `${this.selectedTransaction()!.agent?.prenom || ''} ${this.selectedTransaction()!.agent?.nom || ''}`.trim() || '-',
    telephone: this.selectedTransaction()!.contribuable?.telephone || '',
    nin: this.selectedTransaction()!.contribuable?.nin || '',
    categorie: this.selectedTransaction()!.categorie || '',
    service: this.selectedTransaction()!.service || '',
    quantite: this.selectedTransaction()!.quantite,
    modePaiement: this.selectedTransaction()!.modePaiement || '',
    statut: this.selectedTransaction()!.statut || '',
    };
  }

  protected formatSelectedTransaction2() {
    return this.selectedTransaction()!.date ? new Date(this.selectedTransaction()!.date).toLocaleDateString('fr-FR') : '-';
  }

  protected formatSelectedTransaction3() {
    return this.selectedTransaction()!.date ? new Date(this.selectedTransaction()!.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
  }

  constructor() {
    effect(() => {
      this.categorieId();
      untracked(() => {
    const loadData = async () => {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    this.categories.set((await this.taxesApi.getTaxCategories()) || []);
    if (this.categorieId()) {
    this.services.set(await this.taxesApi.getTaxServices(this.categorieId()!).catch(() => []));
    }
    }
    catch {
    this.categories.set([]);
    this.services.set([]);
    this.errorMsg.set("Impossible de charger les données de cette catégorie.");
    }
    finally {
    this.loading.set(false);
    }
    };
    loadData();
      });
    });
    effect((onCleanup) => {
      void onCleanup;
      this.searchTerm();
      const cleanup = untracked(() => (() => {
    const timer = window.setTimeout(() => this.search.set(this.searchTerm().trim()), 350);
    return () => window.clearTimeout(timer);
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
    effect(() => {
      this.categorieId(); this.selectedYear(); this.search(); this.dateDebut(); this.dateFin();
      untracked(() => {
    this.page.set(1);
      });
    });
    effect((onCleanup) => {
      void onCleanup;
      this.categorieId(); this.selectedYear(); this.search(); this.dateDebut(); this.dateFin(); this.page();
      const cleanup = untracked(() => (() => {
    if (!this.categorieId())
    return;
    const current = ++this.requestId.current;
    this.listLoading.set(true);
    this.taxesApi.getTransactions({
    categorie: this.categorieId(),
    year: this.selectedYear(),
    search: this.search() || undefined,
    startDate: this.dateDebut() || undefined,
    endDate: this.dateFin() || undefined,
    page: this.page(),
    limit: PAGE_SIZE,
    }).then((result) => {
    if (current !== this.requestId.current)
    return;
    this.transactions.set(result.data);
    this.total.set(result.total);
    this.totalRecettes.set(result.montantPaye);
    })
    .catch(() => {
    if (current !== this.requestId.current)
    return;
    this.transactions.set([]);
    this.total.set(0);
    this.totalRecettes.set(0);
    this.errorMsg.set('Impossible de charger les transactions de cette catégorie.');
    })
    .finally(() => {
    if (current === this.requestId.current)
    this.listLoading.set(false);
    });
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
    effect(() => {
      this.categorieId();
      untracked(() => {
    if (this.userRole() === 'regisseur' && this.categorieId() === 'etat-civil')
    this.router.navigateByUrl('/taxes');
    else if (this.userRole() === 'etat_civil' && this.categorieId() !== 'etat-civil')
    this.router.navigateByUrl('/taxes/etat-civil');
      });
    });
  }
}
