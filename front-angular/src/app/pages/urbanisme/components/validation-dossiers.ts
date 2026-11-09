import { ChangeDetectionStrategy, Component, inject, signal, effect, untracked } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { DossierUrbanisme } from '../../../services/urbanisme';
import { YearService } from '../../../core/year/year.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { UrbanismeApi } from '../../../services/urbanisme';

type PendingDossier = {
  id: string;
  numero: string;
  date: string;
  type: string;
  localisation: string;
  surface: string;
  montant: number;
  description: string;
  demandeurNom: string;
  demandeurTelephone: string;
  demandeurAdresse: string;
  createdAt: string;
  action?: 'valider' | 'rejeter';
};

const PAGE_SIZE = 50;

@Component({
  selector: 'app-validation-dossiers',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination],
  templateUrl: './validation-dossiers.html',
})
export class ValidationDossiers {
  protected readonly Math = Math;
  protected readonly PAGE_SIZE = PAGE_SIZE;
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly urbanismeApi = inject(UrbanismeApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly showDetailModal = signal(false);

  protected readonly showValidationModal = signal(false);

  protected readonly selectedDossier = signal<PendingDossier | null>(null);

  protected readonly dossiersEnAttente = signal<PendingDossier[]>([]);

  protected readonly loading = signal(true);

  protected readonly page = signal(1);

  protected readonly total = signal(0);

  protected readonly submitting = signal(false);

  protected async fetchDossiers() {
    try {
    this.loading.set(true);
    const result = await this.urbanismeApi.getDossiersUrbanisme({ page: this.page(), limit: PAGE_SIZE, statut: 'EN_ATTENTE', year: this.selectedYear() });
    this.total.set(result.meta.total);
    const pendingDossiers = (result.data || [])
    .filter((d: DossierUrbanisme) => d.statut === 'EN_ATTENTE')
    .map((d: DossierUrbanisme): PendingDossier => ({
    id: d.id,
    numero: d.numero,
    date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '-',
    type: this.formatType(d.type),
    localisation: d.localisation || '-',
    surface: d.surface ? `${d.surface} m²` : '-',
    montant: d.montant || 0,
    description: d.description || '-',
    demandeurNom: '-',
    demandeurTelephone: '-',
    demandeurAdresse: '-',
    createdAt: d.createdAt,
    }));
    this.dossiersEnAttente.set(pendingDossiers);
    }
    catch {
    this.dossiersEnAttente.set([]);
    this.toast.show("Impossible de charger les dossiers d'urbanisme.", 'error');
    }
    finally {
    this.loading.set(false);
    }
    }

  protected formatType(type: string) {
    const types: Record<string, string> = {
    'permis-construire': 'Permis de construire',
    'autorisation-travaux': 'Autorisation de travaux',
    'certificat-conformite': 'Certificat de conformite',
    'titre-foncier': 'Titre foncier',
    };
    return types[type] || type;
    }

  protected handleConsulter(dossier: PendingDossier) {
    this.selectedDossier.set(dossier);
    this.showDetailModal.set(true);
    }

  protected handleValidation(dossier: PendingDossier, action: 'valider' | 'rejeter') {
    this.selectedDossier.set({ ...dossier, action });
    this.showDetailModal.set(false);
    this.showValidationModal.set(true);
    }

  protected async handleConfirm() {
    if (!this.selectedDossier())
    return;
    this.submitting.set(true);
    try {
    const newStatut = this.selectedDossier()!.action === 'valider' ? 'VALIDE' : 'REJETE';
    await this.urbanismeApi.updateDossierUrbanisme(this.selectedDossier()!.id, { statut: newStatut });
    this.toast.show(this.selectedDossier()!.action === 'valider'
    ? `Dossier ${this.selectedDossier()!.numero} validé avec succès`
    : `Dossier ${this.selectedDossier()!.numero} rejeté`, this.selectedDossier()!.action === 'valider' ? 'success' : 'info');
    await this.fetchDossiers();
    this.showValidationModal.set(false);
    this.selectedDossier.set(null);
    }
    catch {
    this.toast.show('Erreur lors de la mise à jour du dossier', 'error');
    }
    finally {
    this.submitting.set(false);
    }
    }

  constructor() {
    effect(() => {
      this.selectedYear(); this.page();
      untracked(() => {
    this.fetchDossiers();
      });
    });
    effect((onCleanup) => {
      void onCleanup;
      this.selectedYear();
      const cleanup = untracked(() => (() => this.page.set(1))());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
