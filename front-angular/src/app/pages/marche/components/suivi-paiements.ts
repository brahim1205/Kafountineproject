import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { RecuPDF } from '../../../components/feature/recu-pdf';
import { MarcheStats, PaiementMarche } from '../../../services/marche';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../../utils/form-validation';
import { YearService } from '../../../core/year/year.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { serverList } from '../../../shared/utils/server-list';
import { MarcheApi } from '../../../services/marche';

type PaymentStatusLabel = 'Payé' | 'En attente' | 'En retard';

type ReceiptData = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
};

type UiPaiementMarche = PaiementMarche & {
  numero: string;
  occupant: string;
  activite: string;
  statut: PaymentStatusLabel;
  datePaiement: string | null;
};

@Component({
  selector: 'app-suivi-paiements',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination, RecuPDF],
  templateUrl: './suivi-paiements.html',
})
export class SuiviPaiements {
  protected readonly Number = Number;
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly yearService = inject(YearService);
  protected readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly marcheApi = inject(MarcheApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly userRole = computed(() => this.auth.role() || 'admin');

  protected readonly canManage = computed(() => this.auth.canWriteRole(this.userRole()));

  protected readonly showPaiementModal = signal(false);

  protected readonly showRecuPDF = signal(false);

  protected readonly showSuccessMessage = signal(false);

  protected readonly selectedPaiement = signal<UiPaiementMarche | null>(null);

  protected readonly transactionData = signal<ReceiptData | null>(null);

  protected readonly stats = signal<MarcheStats>({ recettesMois: 0, placesOccupees: 0 });

  protected readonly list = serverList<UiPaiementMarche>(async ({ page, limit, search, statut }) => {
    const code = statut === 'Payé' ? 'PAYE' : statut === 'En attente' ? 'EN_ATTENTE' : statut === 'En retard' ? 'RETARD' : undefined;
    const { data, meta } = await this.marcheApi.pagePaiementsMarche({ year: this.selectedYear(), page, limit, search, statut: code });
    return {
    meta,
    data: data.map((p: PaiementMarche): UiPaiementMarche => ({
    ...p,
    numero: p.place?.numero || '-',
    occupant: p.place?.occupant || p.place?.occupantId || 'N/A',
    activite: p.place?.activite || '-',
    statut: p.statut === 'PAYE' ? 'Payé' : p.statut === 'EN_ATTENTE' ? 'En attente' : 'En retard',
    datePaiement: p.datePaiement ? new Date(p.datePaiement).toLocaleDateString('fr-FR') : null,
    })),
    };
    }, computed(() => [this.selectedYear()]), { initialStatut: 'tous' });

  protected readonly counters = computed(() => ({ paid: this.list.counts().PAYE || 0, pending: this.list.counts().EN_ATTENTE || 0, late: this.list.counts().RETARD || 0 }));

  protected async loadData() {
    this.list.reload();
    try {
    this.stats.set((await this.marcheApi.getMarcheStats(this.selectedYear())) || {});
    }
    catch {
    this.stats.set({ recettesMois: 0, placesOccupees: 0 });
    this.toast.show("Impossible de charger les statistiques du marché.", 'error');
    }
    }

  protected handlePayer(paiement: UiPaiementMarche) {
    this.selectedPaiement.set(paiement);
    this.showPaiementModal.set(true);
    }

  protected handleImprimerRecu(paiement: UiPaiementMarche) {
    const now = new Date();
    const recuData = {
    numero: paiement.reference || `MRC-${paiement.id.toString().padStart(5, '0')}`,
    date: paiement.datePaiement || now.toLocaleDateString('fr-FR'),
    heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    contribuable: paiement.occupant,
    type: `Place de marché ${paiement.numero} - ${paiement.periode}`,
    montant: paiement.montant,
    agent: 'Agent Municipal'
    };
    this.transactionData.set(recuData);
    this.showRecuPDF.set(true);
    }

  protected async handleSubmitPaiement(e: Event) {
    e.preventDefault();
    if (!this.selectedPaiement())
    return;
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
    return;
    }
    try {
    const reference = `MRC-${Date.now()}`;
    await this.marcheApi.createPaiementMarche({
    placeId: this.selectedPaiement()!.placeId,
    periode: this.selectedPaiement()!.periode,
    montant: Number(this.selectedPaiement()!.montant),
    reference,
    });
    const now = new Date();
    this.transactionData.set({
    numero: reference,
    date: now.toLocaleDateString('fr-FR'),
    heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    contribuable: this.selectedPaiement()!.occupant,
    type: `Place de marché ${this.selectedPaiement()!.numero} - ${this.selectedPaiement()!.periode}`,
    montant: this.selectedPaiement()!.montant,
    agent: this.auth.userName() || 'Agent Municipal',
    });
    this.showPaiementModal.set(false);
    this.selectedPaiement.set(null);
    this.showSuccessMessage.set(true);
    await this.loadData();
    setTimeout(() => {
    this.showSuccessMessage.set(false);
    this.showRecuPDF.set(true);
    }, 1000);
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, "Impossible d'enregistrer le paiement."), 'error');
    }
    }

  protected toISOStringSummary() {
    return new Date().toISOString().split('T')[0];
  }

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.loadData();
      });
    });
  }
}
