import { ChangeDetectionStrategy, Component, computed, inject, signal, effect, untracked } from '@angular/core';
import { getErrorMessage } from '../../../utils/form-validation';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { DossierUrbanisme } from '../../../services/urbanisme';
import { YearService } from '../../../core/year/year.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { UrbanismeApi, UrbanismeStats } from '../../../services/urbanisme';
import { AuthService } from '../../../core/auth/auth.service';
import { TaxesApi, TaxService } from '../../../services/taxes';
import { NATURES, typeLabel } from './dossiers/dossiers';

type PendingDossier = {
  id: string;
  numero: string;
  date: string;
  type: string;
  localisation: string;
  surface: string;
  nature: string;
  agent: string;
  montant: number;
  description: string;
  demandeurNom: string;
  demandeurTelephone: string;
  demandeurAdresse: string;
  demandeurNin: string;
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
  private readonly auth = inject(AuthService);
  private readonly taxesApi = inject(TaxesApi);

  /** Mr le Maire consulte ; la validation (qui enregistre la recette) revient au régisseur et au super administrateur. */
  protected readonly peutValider = computed(() => this.auth.canWrite() && this.selectedYear() === new Date().getFullYear());

  protected readonly stats = signal<UrbanismeStats | null>(null);

  private readonly types = signal<TaxService[]>([]);

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
    const [result, stats] = await Promise.all([
    this.urbanismeApi.getDossiersUrbanisme({ page: this.page(), limit: PAGE_SIZE, statut: 'EN_ATTENTE', year: this.selectedYear() }),
    this.urbanismeApi.getUrbanismeStats(this.selectedYear()),
    ]);
    this.stats.set(stats);
    this.total.set(result.meta.total);
    const pendingDossiers = (result.data || [])
    .filter((d: DossierUrbanisme) => d.statut === 'EN_ATTENTE')
    .map((d: DossierUrbanisme): PendingDossier => ({
    id: d.id,
    numero: d.numero,
    date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '-',
    type: typeLabel(d, this.types()),
    localisation: d.localisation || '-',
    surface: d.surface ? `${d.surface.toLocaleString('fr-FR')} m²` : '-',
    nature: d.nature ? NATURES[d.nature] || d.nature : '-',
    agent: d.agent || '-',
    montant: d.montant || 0,
    description: d.description || '-',
    demandeurNom: d.contribuable ? `${d.contribuable.prenom || ''} ${d.contribuable.nom || ''}`.trim() || '-' : '-',
    demandeurTelephone: d.contribuable?.telephone || '-',
    demandeurAdresse: d.contribuable?.adresse || '-',
    demandeurNin: d.contribuable?.nin || 'Non renseignée',
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

  protected handleConsulter(dossier: PendingDossier) {
    this.selectedDossier.set(dossier);
    this.showDetailModal.set(true);
    }

  protected handleValidation(dossier: PendingDossier, action: 'valider' | 'rejeter') {
    if (!this.peutValider()) return;
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
    catch (error) {
    this.toast.show(getErrorMessage(error, 'Erreur lors de la mise à jour du dossier'), 'error');
    }
    finally {
    this.submitting.set(false);
    }
    }

  constructor() {
    // Libellés des types depuis le catalogue des tarifs (le dossier stocke l'identifiant du tarif).
    this.taxesApi.getTaxServices('urbanisme-habitat').then((types) => this.types.set(types)).catch(() => this.types.set([]));
    effect(() => {
      this.selectedYear(); this.page(); this.types();
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
