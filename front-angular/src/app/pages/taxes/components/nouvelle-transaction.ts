import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { RecuPDF } from '../../../components/feature/recu-pdf';
import { TaxCategory, TaxService } from '../../../services/taxes';
import { clearFieldValidationError, validateFormElement } from '../../../utils/form-validation';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TaxesApi } from '../../../services/taxes';
import { ContribuablesApi } from '../../../services/contribuables';

type ReceiptTransaction = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
  telephone: string;
  nin: string;
  adresse: string;
  categorie?: string;
  service?: string;
  quantite?: number;
  unite?: string;
  tarifUnitaire?: number;
  modePaiement?: string;
  statut?: string;
  reference?: string;
};

@Component({
  selector: 'app-nouvelle-transaction',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RecuPDF],
  templateUrl: './nouvelle-transaction.html',
})
export class NouvelleTransaction {
  protected readonly Boolean = Boolean;
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly toast = inject(ToastService);
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly taxesApi = inject(TaxesApi);
  protected readonly contribuablesApi = inject(ContribuablesApi);
  protected location = { state: window.history.state as Record<string, unknown> };

  protected readonly preselectedCategoryId = computed(() => typeof (this.location.state as {
    categorieId?: unknown;
    } | null)?.categorieId === 'string'
    ? ((this.location.state as {
    categorieId: string;
    }).categorieId)
    : '');

  protected readonly isEtatCivil = computed(() => this.auth.role() === 'etat_civil');

  protected readonly isRegisseur = computed(() => this.auth.role() === 'regisseur');

  protected readonly etape = signal(1);

  protected readonly showSuccessMessage = signal(false);

  protected readonly showRecuModal = signal(false);

  protected readonly transactionData = signal<ReceiptTransaction | null>(null);

  protected readonly transactionValidee = signal(false);

  protected readonly categories = signal<TaxCategory[]>([]);

  protected readonly services = signal<TaxService[]>([]);

  protected readonly isSubmitting = signal(false);

  protected readonly formData = signal({
    categorie: this.isEtatCivil() ? 'etat-civil' : this.preselectedCategoryId(),
    service: '',
    contribuable: '',
    cni: '',
    telephone: '',
    adresse: '',
    quantite: 1,
    notes: ''
    });

  protected readonly categorieSelectionnee = computed(() => this.categories().find(c => c.id === this.formData().categorie));

  protected readonly serviceSelectionne = computed(() => this.services().find(s => s.id === this.formData().service));

  protected readonly montantTotal = computed(() => this.serviceSelectionne() ? this.serviceSelectionne()!.tarif * this.formData().quantite
    : 0);

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    if (this.etape() === 1) {
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    this.etape.set(2);
    }
    else if (this.etape() === 2) {
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    this.etape.set(3);
    }
    else {
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    this.isSubmitting.set(true);
    const contribuable = await this.contribuablesApi.ensureContribuableByIdentity({
    cni: this.formData().cni,
    fullName: this.formData().contribuable,
    telephone: this.formData().telephone,
    adresse: this.formData().adresse,
    });
    const reference = `TX-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const created = await this.taxesApi.createTransaction({
    contribuableId: contribuable.id,
    categorie: this.formData().categorie,
    type: this.formData().categorie,
    service: this.serviceSelectionne()?.nom || this.formData().service,
    quantite: this.formData().quantite,
    montant: this.montantTotal(),
    modePaiement: 'ESPECE',
    reference,
    });
    const now = new Date();
    const newTransaction = {
    numero: created?.numero || reference,
    date: now.toISOString(),
    heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    contribuable: this.formData().contribuable,
    type: this.serviceSelectionne()?.nom || '',
    montant: this.montantTotal(),
    agent: 'Agent Municipal',
    telephone: this.formData().telephone,
    nin: this.formData().cni,
    adresse: this.formData().adresse,
    categorie: this.categorieSelectionnee()?.nom || this.formData().categorie,
    service: this.serviceSelectionne()?.nom || this.formData().service,
    quantite: this.formData().quantite,
    unite: this.serviceSelectionne()?.unite || '',
    tarifUnitaire: this.serviceSelectionne()?.tarif || 0,
    modePaiement: 'ESPECE',
    statut: 'PAYE',
    reference,
    };
    this.transactionData.set(newTransaction);
    this.transactionValidee.set(true);
    setTimeout(() => {
    this.showSuccessMessage.set(true);
    setTimeout(() => {
    this.showSuccessMessage.set(false);
    }, 3000);
    }, 100);
    }
    catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Impossible d\'enregistrer la transaction.';
    this.toast.show(errorMessage, 'error');
    }
    finally {
    this.isSubmitting.set(false);
    }
    }
    }

  protected handleBack() {
    if (this.etape() > 1) {
    this.etape.set(this.etape() - 1);
    }
    else {
    this.router.navigateByUrl(this.isEtatCivil() ? '/taxes/etat-civil' : '/taxes');
    }
    }

  protected handleRetourListe() {
    this.router.navigateByUrl(this.formData().categorie ? `/taxes/${this.formData().categorie}` : '/taxes');
    }

  protected handleGenererRecu() {
    this.showRecuModal.set(true);
    }

  protected onCategorieChange(e: Event) {
    return this.formData.set({ ...this.formData(), categorie: (e.target as HTMLInputElement).value, service: '' });
  }

  protected onServiceChange(e: Event) {
    return this.formData.set({ ...this.formData(), service: (e.target as HTMLInputElement).value });
  }

  protected onQuantiteChange(e: Event) {
    return this.formData.set({ ...this.formData(), quantite: parseInt((e.target as HTMLInputElement).value) || 1 });
  }

  protected onContribuableChange(e: Event) {
    return this.formData.set({ ...this.formData(), contribuable: (e.target as HTMLInputElement).value });
  }

  protected onCniChange(e: Event) {
    return this.formData.set({ ...this.formData(), cni: (e.target as HTMLInputElement).value });
  }

  protected onTelephoneChange(e: Event) {
    return this.formData.set({ ...this.formData(), telephone: (e.target as HTMLInputElement).value });
  }

  protected onAdresseChange(e: Event) {
    return this.formData.set({ ...this.formData(), adresse: (e.target as HTMLInputElement).value });
  }

  protected onNotesChange(e: Event) {
    return this.formData.set({ ...this.formData(), notes: (e.target as HTMLInputElement).value });
  }

  constructor() {
    effect(() => {
      this.preselectedCategoryId(); this.isEtatCivil(); this.isRegisseur();
      untracked(() => {
    this.taxesApi.getTaxCategories().then((data) => {
    const nextCategories = (data || []).filter((category) => (this.isEtatCivil() ? category.id === 'etat-civil' : !this.isRegisseur() || category.id !== 'etat-civil'));
    this.categories.set(nextCategories);
    if (this.preselectedCategoryId() && !nextCategories.some((category) => category.id === this.preselectedCategoryId())) {
    this.formData.update((current) => ({ ...current, categorie: '' }));
    }
    })
    .catch(() => {
    this.categories.set([]);
    this.toast.show('Impossible de charger les catégories de taxe.', 'error');
    });
      });
    });
    effect((onCleanup) => {
      void onCleanup;
      void this.formData().categorie;
      const cleanup = untracked(() => (() => {
    if (!this.formData().categorie) {
    this.services.set([]);
    return;
    }
    this.taxesApi.getTaxServices(this.formData().categorie).then((data) => this.services.set(data || []))
    .catch(() => {
    this.services.set([]);
    this.toast.show('Impossible de charger les services de cette catégorie.', 'error');
    });
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
