import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { CamionFrigorifique, Expedition } from '../../../services/quai-peche';
import { downloadCsv, today } from '../../../utils/csv';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { fetchAllPages } from '../../../shared/utils/server-list';
import { CamionsTable } from './components/camions-table';
import { ExpeditionsTable } from './components/expeditions-table';
import { CamionModal } from './components/camion-modal';
import { ExpeditionModal } from './components/expedition-modal';
import { DetailModal } from './components/detail-modal';
import { STATUTS_CAMION, STATUTS_EXPEDITION, formatDate } from './components/statuts';
import { YearService } from '../../../core/year/year.service';
import { AuthService } from '../../../core/auth/auth.service';
import { serverList } from '../../../shared/utils/server-list';
import { QuaiPecheApi } from '../../../services/quai-peche';

type Tab = 'camions' | 'expeditions';

type ModalState =
  | { type: 'camion' | 'expedition' }
  | { type: 'detail-camion'; item: CamionFrigorifique }
  | { type: 'detail-expedition'; item: Expedition }
  | null;

@Component({
  selector: 'app-camions-page',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CamionsTable, ExpeditionsTable, Pagination, CamionModal, ExpeditionModal, DetailModal],
  templateUrl: './page.html',
})
export class CamionsPage {
  protected readonly Object = Object;
  protected readonly yearService = inject(YearService);
  protected readonly auth = inject(AuthService);
  protected readonly quaiPecheApi = inject(QuaiPecheApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());

  protected readonly role = computed(() => this.auth.role());

  protected readonly canManage = computed(() => this.isCurrentYear() && (this.role() === 'admin' || this.role() === 'super_admin' || this.role() === 'quai_peche' || this.role() === 'regisseur'));

  protected readonly canDelete = computed(() => this.isCurrentYear() && (this.role() === 'admin' || this.role() === 'super_admin'));

  protected readonly actionError = signal('');

  protected readonly activeTab = signal<Tab>('camions');

  protected readonly modal = signal<ModalState>(null);

  /** Le détail affiche, selon `kind`, les champs du camion ou de l'expédition. */
  protected asDetail(item: CamionFrigorifique | Expedition) {
    return item as CamionFrigorifique & Expedition;
  }

  protected readonly camionsList = serverList<CamionFrigorifique>((query) => this.quaiPecheApi.pageCamions({ year: this.selectedYear(), ...query }), computed(() => [this.selectedYear()]));

  protected readonly expeditionsList = serverList<Expedition>((query) => this.quaiPecheApi.pageExpeditions({ year: this.selectedYear(), ...query }), computed(() => [this.selectedYear()]));

  protected readonly list = computed(() => this.activeTab() === 'camions' ? this.camionsList : this.expeditionsList);

  protected readonly loading = computed(() => this.list().loading());

  protected readonly errorMsg = computed(() => this.actionError() || this.list().error());

  protected readonly searchTerm = computed(() => this.list().search());

  protected readonly setSearchTerm = computed(() => this.list().setSearch);

  protected readonly statutFilter = computed(() => this.list().statut());

  protected readonly setStatutFilter = computed(() => this.list().setStatut);

  protected async loadData() {
    this.camionsList.reload();
    this.expeditionsList.reload();
    }

  protected readonly camionsActifs = signal<CamionFrigorifique[]>([]);

  protected changeTab(tab: Tab) {
    this.activeTab.set(tab);
    }

  protected readonly stats = computed(() => [
    { label: 'Total camions', value: this.camionsList.yearTotal(), icon: 'ri-truck-line', tone: 'bg-blue-100 text-blue-600' },
    { label: 'Camions actifs', value: this.camionsList.counts().ACTIF || 0, icon: 'ri-checkbox-circle-line', tone: 'bg-green-100 text-green-600' },
    { label: 'Expéditions', value: this.expeditionsList.yearTotal(), icon: 'ri-send-plane-line', tone: 'bg-emerald-100 text-emerald-600' },
    {
    label: 'Recettes transport',
    value: `${(this.expeditionsList.meta().somme || 0).toLocaleString('fr-FR')} FCFA`,
    icon: 'ri-money-dollar-circle-line',
    tone: 'bg-emerald-100 text-emerald-600',
    },
    ]);

  protected readonly statuts = computed(() => this.activeTab() === 'camions' ? STATUTS_CAMION : STATUTS_EXPEDITION);

  protected async afterChange() {
    this.modal.set(null);
    await this.loadData();
    }

  protected async supprimerCamion(camion: CamionFrigorifique) {
    if (!confirm(`Supprimer le camion ${camion.immatriculation} ?`))
    return;
    try {
    this.actionError.set('');
    await this.quaiPecheApi.deleteCamion(camion.id);
    await this.loadData();
    }
    catch (error) {
    this.actionError.set(error instanceof Error ? error.message : 'Impossible de supprimer le camion.');
    }
    }

  protected async exporter() {
    const query = { year: this.selectedYear(), search: this.list().appliedSearch(), statut: this.list().statutValue() };
    if (this.activeTab() === 'camions') {
    const rows = await fetchAllPages((page, limit) => this.quaiPecheApi.pageCamions({ ...query, page, limit }));
    downloadCsv(`camions_${today()}.csv`, [
    ['Immatriculation', 'Marque', 'Modèle', 'Capacité (kg)', 'Chauffeur', 'Téléphone', 'Statut'],
    ...rows.map((c) => [c.immatriculation, c.marque, c.modele, c.capacite, c.chauffeur, c.telephone, STATUTS_CAMION[c.statut]?.label || c.statut]),
    ]);
    }
    else {
    const rows = await fetchAllPages((page, limit) => this.quaiPecheApi.pageExpeditions({ ...query, page, limit }));
    downloadCsv(`expeditions_${today()}.csv`, [
    ['Numéro', 'Camion', 'Poids (kg)', 'Destination', 'Montant (FCFA)', 'Date', 'Statut'],
    ...rows.map((e) => [
    e.numero,
    e.camion?.immatriculation,
    e.poids,
    e.destination,
    e.montant,
    formatDate(e.date),
    STATUTS_EXPEDITION[e.statut]?.label || e.statut,
    ]),
    ]);
    }
    }

  protected asSummary() {
    return ([
    ['camions', 'Camions', 'ri-truck-line'],
    ['expeditions', 'Expéditions', 'ri-send-plane-line'],
    ] as const);
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      this.modal()?.type; this.selectedYear();
      const cleanup = untracked(() => (() => {
    if (this.modal()?.type !== 'expedition')
    return;
    this.quaiPecheApi.listCamions({ year: this.selectedYear() }).then((rows) => this.camionsActifs.set(rows.filter((c) => c.statut === 'ACTIF')))
    .catch(() => this.actionError.set('Impossible de charger les camions.'));
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
