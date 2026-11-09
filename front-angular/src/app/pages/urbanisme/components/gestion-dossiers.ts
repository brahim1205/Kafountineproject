import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { RecuPDF } from '../../../components/feature/recu-pdf';
import { DossierUrbanisme } from '../../../services/urbanisme';
import { TaxService } from '../../../services/taxes';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { DossiersTable } from './dossiers/dossiers-table';
import { DossierDetailModal } from './dossiers/dossier-detail-modal';
import { NouveauDossierModal } from './dossiers/nouveau-dossier-modal';
import { receiptFor, ReceiptData } from './dossiers/dossiers';
import { YearService } from '../../../core/year/year.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UrbanismeApi } from '../../../services/urbanisme';
import { TaxesApi } from '../../../services/taxes';

type Modal = { type: 'nouveau' } | { type: 'detail'; dossier: DossierUrbanisme } | null;

const PAGE_SIZE = 50;

@Component({
  selector: 'app-gestion-dossiers',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DossiersTable, Pagination, DossierDetailModal, NouveauDossierModal, RecuPDF],
  templateUrl: './gestion-dossiers.html',
})
export class GestionDossiers {
  protected readonly Math = Math;
  protected readonly PAGE_SIZE = PAGE_SIZE;
  protected readonly receiptFor = receiptFor;
  protected readonly yearService = inject(YearService);
  protected readonly auth = inject(AuthService);
  protected readonly urbanismeApi = inject(UrbanismeApi);
  protected readonly taxesApi = inject(TaxesApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());

  protected readonly canCreate = computed(() => this.auth.canWriteRole() && this.isCurrentYear());

  protected readonly dossiers = signal<DossierUrbanisme[]>([]);

  protected readonly types = signal<TaxService[]>([]);

  protected readonly loading = signal(true);

  protected readonly page = signal(1);

  protected readonly total = signal(0);

  protected readonly error = signal('');

  protected readonly modal = signal<Modal>(null);

  protected readonly created = signal<DossierUrbanisme | null>(null);

  protected readonly receipt = signal<ReceiptData | null>(null);

  protected async loadDossiers() {
    try {
    this.loading.set(true);
    const result = await this.urbanismeApi.getDossiersUrbanisme({ page: this.page(), limit: PAGE_SIZE, year: this.selectedYear() });
    this.dossiers.set(result.data);
    this.total.set(result.meta.total);
    }
    catch {
    this.dossiers.set([]);
    this.error.set("Impossible de charger les dossiers d'urbanisme.");
    }
    finally {
    this.loading.set(false);
    }
    }

  protected async handleCreated(dossier: DossierUrbanisme) {
    this.modal.set(null);
    this.created.set(dossier);
    setTimeout(() => this.created.set(null), 6000);
    await this.loadDossiers();
    }

  constructor() {
    effect(() => {
      this.selectedYear(); this.page();
      untracked(() => {
    this.loadDossiers();
      });
    });
    effect((onCleanup) => {
      void onCleanup;
      this.selectedYear();
      const cleanup = untracked(() => (() => this.page.set(1))());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
    effect(() => {
      
      untracked(() => {
    this.taxesApi.getTaxServices('urbanisme-habitat').then(value => this.types.set(value))
    .catch(() => this.error.set('Impossible de charger les tarifs urbanisme.'));
      });
    });
  }
}
