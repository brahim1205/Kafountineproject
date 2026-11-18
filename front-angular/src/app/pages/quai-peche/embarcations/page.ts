import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { fetchAllPages } from '../../../shared/utils/server-list';
import { EmbarcationFormModal } from './components/embarcation-form-modal';
import { EmbarcationDetailModal } from './components/embarcation-detail-modal';
import { Embarcation, Pecheur } from '../../../services/quai-peche';
import { validateFormElement } from '../../../utils/form-validation';
import { dateDuJour, exporterLignes, FormatExport } from '../../../utils/export';
import { ExportMenu } from '../../../shared/ui/export-menu/export-menu';
import { YearService } from '../../../core/year/year.service';
import { serverList } from '../../../shared/utils/server-list';
import { QuaiPecheApi } from '../../../services/quai-peche';

@Component({
  selector: 'app-embarcations-page',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination, EmbarcationFormModal, EmbarcationDetailModal, ExportMenu],
  templateUrl: './page.html',
})
export class EmbarcationsPage {
  protected readonly yearService = inject(YearService);
  protected readonly quaiPecheApi = inject(QuaiPecheApi);
  protected readonly pecheurs = signal<Pecheur[]>([]);

  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly actionError = signal('');

  protected readonly list = serverList<Embarcation>((query) => this.quaiPecheApi.pageEmbarcations({ year: this.selectedYear(), ...query }), computed(() => [this.selectedYear()]));

  protected readonly errorMsg = computed(() => this.actionError() || this.list.error());

  protected readonly showModal = signal(false);

  protected readonly showViewModal = signal(false);

  protected readonly showEditModal = signal(false);

  protected readonly selectedEmbarcation = signal<Embarcation | null>(null);

  protected readonly formData = signal({
    nom: '',
    immatriculation: '',
    type: 'Pirogue',
    taille: '',
    moteur: '',
    pecheurId: ''
    });

  protected readonly filteredEmbarcations = computed(() => this.list.items());

  protected readonly actifs = computed(() => this.list.counts().ACTIF || 0);

  protected handleView(embarcation: Embarcation) {
    this.selectedEmbarcation.set(embarcation);
    this.showViewModal.set(true);
    }

  protected handleEdit(embarcation: Embarcation) {
    this.selectedEmbarcation.set(embarcation);
    this.formData.set({
    nom: embarcation.nom,
    immatriculation: embarcation.immatriculation,
    type: embarcation.type,
    taille: String(embarcation.taille || ''),
    moteur: embarcation.moteur || '',
    pecheurId: embarcation.pecheurId || ''
    });
    this.showEditModal.set(true);
    }

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    this.actionError.set('');
    await this.quaiPecheApi.createEmbarcation({
    ...this.formData(),
    taille: this.formData().taille ? parseFloat(this.formData().taille) : undefined
    });
    this.showModal.set(false);
    this.formData.set({ nom: '', immatriculation: '', type: 'Pirogue', taille: '', moteur: '', pecheurId: '' });
    this.list.reload();
    }
    catch {
    this.actionError.set("Impossible de créer l'embarcation.");
    }
    }

  protected async handleUpdate(e: Event) {
    e.preventDefault();
    if (!this.selectedEmbarcation())
    return;
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    this.actionError.set('');
    await this.quaiPecheApi.updateEmbarcation(this.selectedEmbarcation()!.id, {
    ...this.formData(),
    taille: this.formData().taille ? parseFloat(this.formData().taille) : undefined
    });
    this.showEditModal.set(false);
    this.list.reload();
    }
    catch {
    this.actionError.set("Impossible de mettre à jour l'embarcation.");
    }
    }

  protected async handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette embarcation?'))
    return;
    try {
    this.actionError.set('');
    await this.quaiPecheApi.deleteEmbarcation(id);
    this.list.reload();
    }
    catch {
    this.actionError.set("Impossible de supprimer l'embarcation.");
    }
    }

  protected async handleExport(format: FormatExport) {
    const rows = await fetchAllPages((page, limit) => this.quaiPecheApi.pageEmbarcations({ year: this.selectedYear(), page, limit, search: this.list.appliedSearch(), statut: this.list.statutValue() }));
    const data = [
    ['Nom', 'Immatriculation', 'Type', 'Taille (m)', 'Moteur', 'Propriétaire', 'Statut'],
    ...rows.map(e => [
    e.nom, e.immatriculation, e.type, e.taille ? String(e.taille) : '-', e.moteur || '-', `${e.pecheur?.prenom || ''} ${e.pecheur?.nom || ''}`, e.statut
    ])
    ];
    exporterLignes(format, 'Embarcations du quai de pêche', `embarcations_${dateDuJour()}`, data, `Exercice ${this.selectedYear()}`);
    }

  protected filteredEmbarcationsSummary() {
    return this.filteredEmbarcations().filter(e => e.statut === 'EN_MAINTENANCE').length;
  }

  constructor() {
    effect(() => {
      this.showModal(); this.showEditModal(); this.selectedYear(); void this.pecheurs().length;
      untracked(() => {
    if ((this.showModal() || this.showEditModal()) && this.pecheurs().length === 0) {
    this.quaiPecheApi.listPecheurs({ year: this.selectedYear() }).then(value => this.pecheurs.set(value)).catch(() => this.actionError.set('Impossible de charger les pêcheurs.'));
    }
      });
    });
  }
}
