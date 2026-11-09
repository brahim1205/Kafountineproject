import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { LigneBudgetaire, LigneBudgetairePayload } from '../../services/budget';
import { BudgetSummary } from './components/budget-summary';
import { BudgetTable } from './components/budget-table';
import { LigneDetailModal } from './components/ligne-detail-modal';
import { LigneFormModal } from './components/ligne-form-modal';
import { YearService } from '../../core/year/year.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { BudgetApi } from '../../services/budget';

type ModalState = { type: 'create' } | { type: 'edit' | 'view'; ligne: LigneBudgetaire } | null;

@Component({
  selector: 'app-gestion-budget-page',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BudgetSummary, BudgetTable, LigneFormModal, LigneDetailModal],
  templateUrl: './page.html',
})
export class GestionBudgetPage {
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly budgetApi = inject(BudgetApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly lignes = signal<LigneBudgetaire[]>([]);

  protected readonly loading = signal(true);

  protected readonly deleting = signal(false);

  protected readonly modal = signal<ModalState>(null);

  protected readonly role = computed(() => this.auth.role());

  protected readonly canDelete = computed(() => this.role() === 'super_admin');

  protected async loadBudgetData() {
    try {
    this.loading.set(true);
    const data = await this.budgetApi.listLignesBudgetaires(this.selectedYear());
    this.lignes.set(Array.isArray(data) ? data : []);
    }
    catch {
    this.lignes.set([]);
    }
    finally {
    this.loading.set(false);
    }
    }

  protected readonly totalPrevu = computed(() => this.lignes().reduce((sum, ligne) => sum + ligne.prevu, 0));

  protected readonly totalDepenses = computed(() => this.lignes().reduce((sum, ligne) => sum + ligne.depense, 0));

  protected save(action: () => Promise<unknown>, success: string, failure: string) {
    return async () => {
    try {
    await action();
    await this.loadBudgetData();
    this.modal.set(null);
    this.toast.show(success, 'success');
    }
    catch (error) {
    this.toast.show(error instanceof Error ? error.message : failure, 'error');
    throw error;
    }
    };
  }

  protected handleCreate(payload: LigneBudgetairePayload) {
    return this.save(() => this.budgetApi.createLigneBudgetaire({ ...payload, year: this.selectedYear() }), 'Ligne budgétaire créée avec succès.', 'Création impossible.')();
  }

  protected handleUpdate(ligne: LigneBudgetaire) {
    return (payload: LigneBudgetairePayload) => this.save(() => this.budgetApi.updateLigneBudgetaire(ligne.id, payload), 'Ligne budgétaire mise à jour avec succès.', 'Mise à jour impossible.')();
  }

  protected async handleDelete(ligne: LigneBudgetaire) {
    if (!window.confirm(`Supprimer la ligne budgétaire "${ligne.code} - ${ligne.libelle}" ?`)) {
    return;
    }
    try {
    this.deleting.set(true);
    await this.budgetApi.deleteLigneBudgetaire(ligne.id);
    const current = this.modal();
    if (current && current.type !== 'create' && current.ligne.id === ligne.id) {
    this.modal.set(null);
    }
    await this.loadBudgetData();
    this.toast.show('Ligne budgétaire supprimée avec succès.', 'success');
    }
    catch (error) {
    this.toast.show(error instanceof Error ? error.message : 'Suppression impossible.', 'error');
    }
    finally {
    this.deleting.set(false);
    }
    }

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.loadBudgetData();
      });
    });
  }
}
