import { ChangeDetectionStrategy, Component, inject, output, signal, computed, effect, untracked } from '@angular/core';
import { RecuPDF } from '../../../components/feature/recu-pdf';
import { TaxService } from '../../../services/taxes';
import { clearFieldValidationError, validateFormElement } from '../../../utils/form-validation';
import { YearService } from '../../../core/year/year.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { EtatCivilApi } from '../../../services/etat-civil';
import { ContribuablesApi } from '../../../services/contribuables';

type ReceiptData = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
};

@Component({
  selector: 'app-traiter-demande',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RecuPDF],
  templateUrl: './traiter-demande.html',
})
export class TraiterDemande {
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly etatCivilApi = inject(EtatCivilApi);
  protected readonly contribuablesApi = inject(ContribuablesApi);
  readonly success = output<void>();

  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly typeDocument = signal('');

  protected readonly showRecuPDF = signal(false);

  protected readonly transactionData = signal<ReceiptData | null>(null);

  protected readonly isSubmitting = signal(false);

  protected readonly error = signal('');

  protected readonly typesDocuments = signal<Array<Pick<TaxService, 'id' | 'nom' | 'tarif'>>>([]);

  protected readonly formData = signal({
    nomComplet: '',
    cni: '',
    telephone: '',
    adresse: '',
    exemplaires: 1,
    observations: '',
    });

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    this.error.set('');
    this.isSubmitting.set(true);
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    this.isSubmitting.set(false);
    return;
    }
    try {
    const selectedDoc = this.typesDocuments().find(d => d.id === this.typeDocument());
    if (!selectedDoc) {
    this.error.set('Veuillez sélectionner un type de document');
    this.isSubmitting.set(false);
    return;
    }
    const exemplaire = parseInt(String(this.formData().exemplaires)) || 1;
    const montantTotal = selectedDoc.tarif * exemplaire;
    const contribuable = await this.contribuablesApi.ensureContribuableByIdentity({
    cni: this.formData().cni,
    fullName: this.formData().nomComplet,
    telephone: this.formData().telephone,
    adresse: this.formData().adresse,
    });
    const created = await this.etatCivilApi.createEtatCivilDemande({
    contribuableId: contribuable.id,
    typeDocument: selectedDoc.nom,
    exemplaires: exemplaire,
    montant: montantTotal,
    observations: this.formData().observations.trim() || undefined,
    year: this.selectedYear(),
    });
    const numeroTransaction = created.numero;
    const now = new Date();
    const newTransaction = {
    numero: numeroTransaction,
    date: now.toLocaleDateString('fr-FR'),
    heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    contribuable: this.formData().nomComplet,
    type: `${selectedDoc.nom}${exemplaire > 1 ? ` (${exemplaire} exemplaires)` : ''}`,
    montant: montantTotal,
    agent: this.auth.userName() || 'Agent État Civil',
    };
    this.transactionData.set(newTransaction);
    this.toast.show(`Demande ${numeroTransaction} enregistrée avec succès`, 'success');
    const shouldPrint = window.confirm('Demande enregistrée ! Voulez-vous imprimer le reçu ?');
    if (shouldPrint) {
    this.showRecuPDF.set(true);
    }
    else {
    this.resetForm();
    this.success.emit();
    }
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : "Impossible d'enregistrer la demande");
    }
    finally {
    this.isSubmitting.set(false);
    }
    }

  protected resetForm() {
    this.typeDocument.set('');
    this.transactionData.set(null);
    this.formData.set({
    nomComplet: '',
    cni: '',
    telephone: '',
    adresse: '',
    exemplaires: 1,
    observations: '',
    });
    }

  protected readonly selectedDoc = computed(() => this.typesDocuments().find(d => d.id === this.typeDocument()));

  protected onNomCompletChange(e: Event) {
    return this.formData.set({ ...this.formData(), nomComplet: (e.target as HTMLInputElement).value });
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

  protected onExemplairesChange(e: Event) {
    return this.formData.set({ ...this.formData(), exemplaires: parseInt((e.target as HTMLInputElement).value) || 1 });
  }

  protected onObservationsChange(e: Event) {
    return this.formData.set({ ...this.formData(), observations: (e.target as HTMLInputElement).value });
  }

  constructor() {
    effect(() => {
      
      untracked(() => {
    const loadServices = async () => {
    try {
    const services = await this.etatCivilApi.getEtatCivilDocumentTypes();
    this.typesDocuments.set(services.map((service) => ({
    id: service.id,
    nom: service.nom,
    tarif: service.tarif,
    })));
    }
    catch {
    this.error.set('Impossible de charger les tarifs de l\'état civil.');
    }
    };
    loadServices();
      });
    });
  }
}
