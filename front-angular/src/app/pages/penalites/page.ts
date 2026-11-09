import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { Penalite } from '../../services/settings';
import { RecuPDF } from '../../components/feature/recu-pdf';
import { ContribuableSelect, requireSelectedContribuable } from '../../components/feature/contribuable-select';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../utils/form-validation';
import { AuthService } from '../../core/auth/auth.service';
import { SettingsApi } from '../../services/settings';
import { TaxesApi } from '../../services/taxes';

const INPUT_CLASS = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500';

@Component({
  selector: 'app-penalites',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContribuableSelect, RecuPDF],
  templateUrl: './page.html',
})
export class Penalites {
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly auth = inject(AuthService);
  protected readonly settingsApi = inject(SettingsApi);
  protected readonly taxesApi = inject(TaxesApi);
  protected readonly canApply = computed(() => this.auth.canWriteRole());

  protected readonly penalites = signal<Penalite[]>([]);

  protected readonly loading = signal(true);

  protected readonly searchTerm = signal('');

  protected readonly showAssociateModal = signal(false);

  protected readonly showPdfPreview = signal(false);

  protected readonly selectedPenalite = signal<Penalite | null>(null);

  protected readonly applying = signal(false);

  protected readonly receiptData = signal<Record<string, unknown> | null>(null);

  protected readonly successMessage = signal('');

  protected readonly errorMessage = signal('');

  protected async loadData() {
    this.loading.set(true);
    try {
    const penalitesData = await this.settingsApi.getPenalites();
    this.penalites.set(penalitesData.filter((p: Penalite) => p.actif));
    }
    catch (error) {
    this.showError(error instanceof Error ? error.message : 'Impossible de charger les données.');
    }
    finally {
    this.loading.set(false);
    }
    }

  protected showSuccess(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3000);
    }

  protected showError(message: string) {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
    }

  protected async handleAssociate(e: Event) {
    e.preventDefault();
    const form = (e.currentTarget as HTMLFormElement);
    if (!this.selectedPenalite() || !validateFormElement(form))
    return;
    const contribuableId = requireSelectedContribuable(form, 'contribuableId');
    if (!contribuableId)
    return;
    const label = String(new FormData(form).get('contribuableRecherche') || '');
    const nin = label.match(/\(([^)]*)\)\s*$/)?.[1] || '';
    this.applying.set(true);
    try {
    const type = `Pénalité (${this.selectedPenalite()!.type})`;
    const created = await this.taxesApi.createTransaction({
    contribuableId,
    categorie: 'Pénalités',
    type,
    service: type,
    quantite: 1,
    montant: this.selectedPenalite()!.montant,
    modePaiement: 'ESPECE',
    reference: `PEN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
    });
    const date = created?.date ? new Date(created.date) : new Date();
    this.receiptData.set({
    ticketNumber: created.numero,
    date: date.toLocaleDateString('fr-FR'),
    time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    contributor: label.replace(/\s*\([^)]*\)\s*$/, ''),
    type,
    amount: this.selectedPenalite()!.montant,
    agent: this.auth.userName() || 'Agent Municipal',
    nin,
    description: this.selectedPenalite()!.description,
    statut: 'Validé',
    });
    this.showSuccess(`Pénalité enregistrée sous le numéro ${created.numero}.`);
    this.showAssociateModal.set(false);
    this.showPdfPreview.set(true);
    }
    catch (error) {
    this.showError(getErrorMessage(error, "Impossible d'enregistrer la pénalité."));
    }
    finally {
    this.applying.set(false);
    }
    }

  protected formatMontant(montant: number) {
    return new Intl.NumberFormat('fr-FR').format(montant);
    }

  protected readonly filteredPenalites = computed(() => this.penalites().filter(p => p.type.toLowerCase().includes(this.searchTerm().toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(this.searchTerm().toLowerCase()))));

  constructor() {
    effect(() => {
      
      untracked(() => {
    this.loadData();
      });
    });
  }
}
