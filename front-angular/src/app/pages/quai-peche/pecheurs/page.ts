import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { fetchAllPages } from '../../../shared/utils/server-list';
import { PecheurFormModal } from './components/pecheur-form-modal';
import { PecheurDetailModal } from './components/pecheur-detail-modal';
import { Pecheur } from '../../../services/quai-peche';
import { validateFormElement } from '../../../utils/form-validation';
import { dateDuJour, exporterLignes, FormatExport } from '../../../utils/export';
import { ExportMenu } from '../../../shared/ui/export-menu/export-menu';
import { YearService } from '../../../core/year/year.service';
import { serverList } from '../../../shared/utils/server-list';
import { QuaiPecheApi } from '../../../services/quai-peche';

@Component({
  selector: 'app-pecheurs-page',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination, PecheurFormModal, PecheurDetailModal, ExportMenu],
  templateUrl: './page.html',
})
export class PecheursPage {
  protected readonly yearService = inject(YearService);
  protected readonly quaiPecheApi = inject(QuaiPecheApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly actionError = signal('');

  protected readonly list = serverList<Pecheur>((query) => this.quaiPecheApi.pagePecheurs({ year: this.selectedYear(), ...query }), computed(() => [this.selectedYear()]));

  protected readonly errorMsg = computed(() => this.actionError() || this.list.error());

  protected readonly showModal = signal(false);

  protected readonly showViewModal = signal(false);

  protected readonly showEditModal = signal(false);

  protected readonly selectedPecheur = signal<Pecheur | null>(null);

  protected readonly formData = signal({
    nom: '',
    prenom: '',
    telephone: '',
    nin: '',
    adresse: ''
    });

  protected readonly filteredPecheurs = computed(() => this.list.items());

  protected readonly actifs = computed(() => this.list.counts().ACTIF || 0);

  protected handleView(pecheur: Pecheur) {
    this.selectedPecheur.set(pecheur);
    this.showViewModal.set(true);
    }

  protected handleEdit(pecheur: Pecheur) {
    this.selectedPecheur.set(pecheur);
    this.formData.set({
    nom: pecheur.nom,
    prenom: pecheur.prenom,
    telephone: pecheur.telephone || '',
    nin: pecheur.nin || '',
    adresse: pecheur.adresse || ''
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
    await this.quaiPecheApi.createPecheur(this.formData());
    this.showModal.set(false);
    this.formData.set({ nom: '', prenom: '', telephone: '', nin: '', adresse: '' });
    this.list.reload();
    }
    catch {
    this.actionError.set("Impossible de créer le pêcheur.");
    }
    }

  protected async handleUpdate(e: Event) {
    e.preventDefault();
    if (!this.selectedPecheur())
    return;
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    this.actionError.set('');
    await this.quaiPecheApi.updatePecheur(this.selectedPecheur()!.id, this.formData());
    this.showEditModal.set(false);
    this.list.reload();
    }
    catch {
    this.actionError.set("Impossible de mettre à jour le pêcheur.");
    }
    }

  protected async handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce pêcheur?'))
    return;
    try {
    this.actionError.set('');
    await this.quaiPecheApi.deletePecheur(id);
    this.list.reload();
    }
    catch {
    this.actionError.set("Impossible de supprimer le pêcheur.");
    }
    }

  protected async handleExport(format: FormatExport) {
    const rows = await fetchAllPages((page, limit) => this.quaiPecheApi.pagePecheurs({ year: this.selectedYear(), page, limit, search: this.list.appliedSearch(), statut: this.list.statutValue() }));
    const data = [
    ['Nom', 'Prénom', 'Téléphone', 'NIN', 'Adresse', 'Statut'],
    ...rows.map(p => [
    p.nom, p.prenom, p.telephone || '-', p.nin || '-', p.adresse || '-', p.statut
    ])
    ];
    exporterLignes(format, 'Pêcheurs du quai', `pecheurs_${dateDuJour()}`, data, `Exercice ${this.selectedYear()}`);
    }
}
