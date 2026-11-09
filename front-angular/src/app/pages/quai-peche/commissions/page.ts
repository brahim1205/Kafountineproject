import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { fetchAllPages } from '../../../shared/utils/server-list';
import { CommissionFormModal } from './components/commission-form-modal';
import { CommissionDetailModal } from './components/commission-detail-modal';
import { Commission, Pecheur } from '../../../services/quai-peche';
import { validateFormElement } from '../../../utils/form-validation';
import { downloadCsv, today } from '../../../utils/csv';
import { YearService } from '../../../core/year/year.service';
import { serverList } from '../../../shared/utils/server-list';
import { QuaiPecheApi } from '../../../services/quai-peche';

@Component({
  selector: 'app-commissions-page',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination, CommissionFormModal, CommissionDetailModal],
  templateUrl: './page.html',
})
export class CommissionsPage {
  protected readonly yearService = inject(YearService);
  protected readonly quaiPecheApi = inject(QuaiPecheApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly pecheurs = signal<Pecheur[]>([]);

  protected readonly actionError = signal('');

  protected readonly list = serverList<Commission>((query) => this.quaiPecheApi.pageCommissions({ year: this.selectedYear(), ...query }), computed(() => [this.selectedYear()]));

  protected readonly errorMsg = computed(() => this.actionError() || this.list.error());

  protected readonly showModal = signal(false);

  protected readonly showViewModal = signal(false);

  protected readonly selectedCommission = signal<Commission | null>(null);

  protected readonly formData = signal({
    pecheurId: '',
    poids: '',
    typePoisson: 'Maquereau',
    temperatura: '',
    observations: ''
    });

  protected readonly filteredCommissions = computed(() => this.list.items());

  protected readonly totalPoids = computed(() => this.list.meta().somme || 0);

  protected readonly enAttente = computed(() => this.list.counts().ENREGISTREE || 0);

  protected async handleValidate(id: string) {
    try {
    this.actionError.set('');
    await this.quaiPecheApi.validateCommission(id);
    this.list.items.set(this.list.items().map(c => c.id === id ? { ...c, statut: 'VALIDEE' } : c));
    }
    catch {
    this.actionError.set("Impossible de valider la commission.");
    }
    }

  protected handleView(commission: Commission) {
    this.selectedCommission.set(commission);
    this.showViewModal.set(true);
    }

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    this.actionError.set('');
    await this.quaiPecheApi.createCommission({
    pecheurId: this.formData().pecheurId,
    poids: parseFloat(this.formData().poids),
    typePoisson: this.formData().typePoisson,
    temperatura: this.formData().temperatura ? parseFloat(this.formData().temperatura) : undefined,
    observations: this.formData().observations || undefined
    });
    this.showModal.set(false);
    this.formData.set({ pecheurId: '', poids: '', typePoisson: 'Maquereau', temperatura: '', observations: '' });
    this.list.reload();
    }
    catch {
    this.actionError.set("Impossible de créer la commission.");
    }
    }

  protected async handleExport() {
    const rows = await fetchAllPages((page, limit) => this.quaiPecheApi.pageCommissions({ year: this.selectedYear(), page, limit, search: this.list.appliedSearch(), statut: this.list.statutValue() }));
    const data = [
    ['Numéro', 'Pêcheur', 'Poids (kg)', 'Type', 'Température', 'Date', 'Statut'],
    ...rows.map(c => [
    c.numero,
    `${c.pecheur?.prenom || ''} ${c.pecheur?.nom || ''}`,
    String(c.poids),
    c.typePoisson,
    c.temperatura ? `${c.temperatura}°C` : '-',
    new Date(c.date).toLocaleDateString('fr-FR'),
    c.statut
    ])
    ];
    downloadCsv(`commissions_${today()}.csv`, data);
    }

  protected formatToLocaleDateString(item: { date: string | number | Date }) {
    return new Date(item.date).toLocaleDateString('fr-FR');
  }

  constructor() {
    effect(() => {
      this.showModal(); this.selectedYear(); this.pecheurs().length;
      untracked(() => {
    if ((this.showModal()) && this.pecheurs().length === 0) {
    this.quaiPecheApi.listPecheurs({ year: this.selectedYear() }).then(value => this.pecheurs.set(value)).catch(() => this.actionError.set('Impossible de charger les pêcheurs.'));
    }
      });
    });
  }
}
