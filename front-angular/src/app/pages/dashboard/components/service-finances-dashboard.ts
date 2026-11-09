import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { validateFormElement } from '../../../utils/form-validation';
import { LigneBudgetModal } from './ligne-budget-modal';
import { DepenseModal } from './depense-modal';
import { YearService } from '../../../core/year/year.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiService } from '../../../core/api/api.service';

type LigneBudgetaire = {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense: number;
  year: number;
};

type DemandeDepense = {
  id: string;
  service: string;
  description: string;
  montant: number;
  statut: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';
  motif: string | null;
  createdAt: string;
};

type BudgetStats = {
  totalPrevu: number;
  totalDepense: number;
  totalReste: number;
  tauxExecution: number;
  nombreLignes: number;
  demandesEnAttente: number;
  demandesApprouvees: number;
  demandesRejetees: number;
};

@Component({
  selector: 'app-service-finances-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LigneBudgetModal, DepenseModal],
  templateUrl: './service-finances-dashboard.html',
})
export class ServiceFinancesDashboard {
  protected readonly Math = Math;
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly apiService = inject(ApiService);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly userRole = computed(() => this.auth.role() || 'service_finances');

  protected readonly userName = computed(() => this.auth.userName() || 'Service des Finances');

  protected readonly canDecide = computed(() => this.userRole() === 'super_admin');

  protected readonly canWrite = computed(() => this.auth.canWriteRole(this.userRole()));

  protected readonly showsDecisions = computed(() => this.canDecide() || this.userRole() === 'admin');

  protected readonly showModalBudget = signal(false);

  protected readonly showModalDepense = signal(false);

  protected readonly activeTab = signal<'budget' | 'depenses'>(this.showsDecisions() ? 'depenses' : 'budget');

  protected readonly newLigneBudget = signal({ code: '', libelle: '', prevu: 0 });

  protected readonly newDepense = signal({ service: '', description: '', montant: 0 });

  protected readonly budgetPrevisionnel = signal<LigneBudgetaire[]>([]);

  protected readonly demandesDepenses = signal<DemandeDepense[]>([]);

  protected readonly stats = signal<BudgetStats | null>(null);

  protected readonly loading = signal(true);

  protected readonly errorMsg = signal('');

  protected async loadBudgetData() {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    const [lignes, demandes, statsData] = await Promise.all([
    this.apiService.request<LigneBudgetaire[]>(`/budget/lignes?year=${this.selectedYear()}`),
    this.apiService.request<DemandeDepense[]>(`/budget/demandes?year=${this.selectedYear()}`),
    this.apiService.request<BudgetStats>(`/budget/stats?year=${this.selectedYear()}`),
    ]);
    this.budgetPrevisionnel.set(Array.isArray(lignes) ? lignes : []);
    this.demandesDepenses.set(Array.isArray(demandes) ? demandes : []);
    this.stats.set(statsData || null);
    }
    catch {
    this.budgetPrevisionnel.set([]);
    this.demandesDepenses.set([]);
    this.stats.set(null);
    this.errorMsg.set("Impossible de charger les données budgétaires.");
    }
    finally {
    this.loading.set(false);
    }
    }

  protected readonly totalPrevu = computed(() => this.stats()?.totalPrevu ?? this.budgetPrevisionnel().reduce((s, b) => s + b.prevu, 0));

  protected readonly totalDepense = computed(() => this.stats()?.totalDepense ?? this.budgetPrevisionnel().reduce((s, b) => s + b.depense, 0));

  protected readonly totalReste = computed(() => this.stats()?.totalReste ?? (this.totalPrevu() - this.totalDepense()));

  protected readonly tauxExecution = computed(() => this.stats()?.tauxExecution ?? (this.totalPrevu() > 0 ? Math.round((this.totalDepense() / this.totalPrevu()) * 100) : 0));

  protected async handleApprouver(id: string) {
    try {
    await this.apiService.request(`/budget/demandes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ statut: 'APPROUVE' }),
    });
    this.demandesDepenses.set(this.demandesDepenses().map(d => d.id === id ? { ...d, statut: 'APPROUVE' as const } : d));
    this.toast.show('Demande approuvée.', 'success');
    }
    catch {
    this.toast.show('Erreur lors de l\'approbation de la demande', 'error');
    }
    }

  protected async handleRejeter(id: string) {
    try {
    await this.apiService.request(`/budget/demandes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ statut: 'REJETE' }),
    });
    this.demandesDepenses.set(this.demandesDepenses().map(d => d.id === id ? { ...d, statut: 'REJETE' as const } : d));
    this.toast.show('Demande rejetée.', 'warning');
    }
    catch {
    this.toast.show('Erreur lors du rejet de la demande', 'error');
    }
    }

  protected async handleAddLigneBudgetaire(e: Event) {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    await this.apiService.request<LigneBudgetaire>('/budget/lignes', {
    method: 'POST',
    body: JSON.stringify({
    code: this.newLigneBudget().code,
    libelle: this.newLigneBudget().libelle,
    prevu: this.newLigneBudget().prevu,
    year: this.selectedYear(),
    }),
    });
    this.toast.show('Ligne budgétaire ajoutée avec succès!', 'success');
    this.loadBudgetData();
    this.showModalBudget.set(false);
    this.newLigneBudget.set({ code: '', libelle: '', prevu: 0 });
    }
    catch {
    this.toast.show('Erreur lors de l\'ajout de la ligne budgétaire', 'error');
    }
    }

  protected async handleAddDepense(e: Event) {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    await this.apiService.request<DemandeDepense>('/budget/demandes', {
    method: 'POST',
    body: JSON.stringify({
    service: this.newDepense().service,
    description: this.newDepense().description,
    montant: this.newDepense().montant,
    year: this.selectedYear(),
    }),
    });
    this.toast.show('Demande de dépense soumise avec succès!', 'success');
    this.loadBudgetData();
    this.showModalDepense.set(false);
    this.newDepense.set({ service: '', description: '', montant: 0 });
    }
    catch {
    this.toast.show('Erreur lors de la soumission de la demande', 'error');
    }
    }

  protected formatToLocaleDateString(demande: { createdAt: string | number | Date }) {
    return new Date(demande.createdAt).toLocaleDateString('fr-FR');
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
