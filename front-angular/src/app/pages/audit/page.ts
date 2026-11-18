import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { exporter, FormatExport, tableauDepuisCsv } from '../../utils/export';
import { ExportMenu } from '../../shared/ui/export-menu/export-menu';
import { YearService } from '../../core/year/year.service';
import { AuditApi } from '../../services/audit';

interface AuditLog {
  id: string;
  date: string;
  time: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  status: 'success' | 'warning' | 'error';
}

const PAGE_SIZE = 25;

@Component({
  selector: 'app-audit',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExportMenu],
  templateUrl: './page.html',
})
export class Audit {
  protected readonly yearService = inject(YearService);
  protected readonly auditApi = inject(AuditApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly searchTerm = signal('');

  protected readonly filterModule = signal('all');

  protected readonly filterStatus = signal('all');

  protected readonly showDetailModal = signal(false);

  protected readonly showSuccessMessage = signal(false);

  protected readonly selectedLog = signal<AuditLog | null>(null);

  protected readonly loading = signal(true);

  protected readonly auditLogs = signal<AuditLog[]>([]);

  protected readonly stats = signal({ total: 0, success: 0, warning: 0, error: 0 });

  protected readonly errorMsg = signal('');

  protected readonly page = signal(1);

  protected readonly totalPages = signal(1);

  protected readonly debouncedSearch = signal('');

  protected readonly filteredLogs = computed(() => this.auditLogs());

  protected async handleExport(format: FormatExport) {
    try {
    const blob = await this.auditApi.exportAuditLogs(this.selectedYear());
    exporter(format, tableauDepuisCsv(await blob.text(), `Journal d'audit ${this.selectedYear()}`, `journal-audit-${this.selectedYear()}`));
    this.showSuccessMessage.set(true);
    setTimeout(() => this.showSuccessMessage.set(false), 3000);
    }
    catch (error) {
    this.errorMsg.set(error instanceof Error ? error.message : "Impossible d'exporter le journal d'audit.");
    }
    }

  protected openDetailModal(log: AuditLog) {
    this.selectedLog.set(log);
    this.showDetailModal.set(true);
    }

  protected badge(status: string) {
    return ({ success: { cls: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700', html: '<i class="ri-check-line mr-1"></i>Succès' }, warning: { cls: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700', html: '<i class="ri-alert-line mr-1"></i>Avertissement' }, error: { cls: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700', html: '<i class="ri-close-line mr-1"></i>Erreur' } } as Record<string, {
    cls: string;
    html: string;
    }>)[status];
  }

  protected userInitials(log: { user: string }) {
    return log.user.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
  }

  protected pageSummary() {
    return this.page.update((p) => Math.max(1, p - 1));
  }

  protected pageSummary2() {
    return this.page.update((p) => Math.min(this.totalPages(), p + 1));
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      this.searchTerm();
      const cleanup = untracked(() => (() => {
    const timer = window.setTimeout(() => this.debouncedSearch.set(this.searchTerm().trim()), 300);
    return () => window.clearTimeout(timer);
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
    effect(() => {
      this.selectedYear(); this.filterModule(); this.filterStatus(); this.debouncedSearch();
      untracked(() => {
    this.page.set(1);
      });
    });
    effect(() => {
      this.selectedYear(); this.filterModule(); this.filterStatus(); this.debouncedSearch(); this.page();
      untracked(() => {
    const loadAuditLogs = async () => {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    const data = await this.auditApi.getAuditLogs({
    year: this.selectedYear(),
    search: this.debouncedSearch() || undefined,
    module: this.filterModule(),
    statut: this.filterStatus(),
    page: this.page(),
    limit: PAGE_SIZE,
    });
    this.auditLogs.set(data?.logs || []);
    this.stats.set(data?.stats || { total: 0, success: 0, warning: 0, error: 0 });
    this.totalPages.set(data?.pagination?.totalPages || 1);
    }
    catch {
    this.auditLogs.set([]);
    this.stats.set({ total: 0, success: 0, warning: 0, error: 0 });
    this.errorMsg.set("Impossible de charger le journal d'audit.");
    }
    finally {
    this.loading.set(false);
    }
    };
    loadAuditLogs();
      });
    });
  }
}
