import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { MotoPayment, MotoStats } from '../../services/motos';
import { RecuPDF } from '../../components/feature/recu-pdf';
import { MotosStats } from './components/motos-stats';
import { MotoList } from './components/moto-list';
import { MotoPaymentsTable } from './components/moto-payments-table';
import { MotosEnRetard } from './components/motos-en-retard';
import { EnregistrementMotoModal } from './components/enregistrement-moto-modal';
import { PaiementMotoModal } from './components/paiement-moto-modal';
import { ChangementMotoModal } from './components/changement-moto-modal';
import { FULL_DATE, SHORT_TIME, toUiMotoPayment, libellePaiement, MotoConfig, ReceiptData, UiMoto, UiMotoPayment } from './types';
import { YearService } from '../../core/year/year.service';
import { AuthService } from '../../core/auth/auth.service';
import { MotosApi } from '../../services/motos';

type Tab = 'liste' | 'paiements' | 'retards';

type Modal = { type: 'enregistrement' } | { type: 'paiement' | 'changement'; moto: UiMoto } | null;

const EMPTY_STATS: MotoStats = { totalMotos: 0, paiementsMois: 0, enRetard: 0, recettesMois: 0 };

const EMPTY_CONFIG: MotoConfig = { droitAdhesion: 0, tarifMensuel: 0, penaliteRetard: 0, amendePolice: 0 };

@Component({
  selector: 'app-motos-page',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MotosStats, MotoList, MotoPaymentsTable, MotosEnRetard, EnregistrementMotoModal, PaiementMotoModal, ChangementMotoModal, RecuPDF],
  templateUrl: './page.html',
})
export class MotosPage {
  protected readonly yearService = inject(YearService);
  protected readonly auth = inject(AuthService);
  protected readonly motosApi = inject(MotosApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());

  protected readonly userRole = computed(() => this.auth.role() || 'admin');

  protected readonly canManage = computed(() => this.auth.role() !== 'quai_peche' && this.auth.canWriteRole(this.userRole()) && this.isCurrentYear());

  /** L’adhésion d’une moto et ses changements relèvent du régisseur : l’agent enregistre seulement cotisations et retards. */
  protected readonly canAdhesion = computed(() => this.canManage() && this.auth.role() !== 'agent');

  protected readonly activeTab = signal<Tab>(this.userRole() === 'admin' ? 'paiements' : 'liste');

  protected readonly modal = signal<Modal>(null);

  protected readonly receipt = signal<ReceiptData | null>(null);

  protected readonly successMessage = signal('');

  protected readonly error = signal('');

  protected readonly reloadKey = signal(0);

  protected readonly stats = signal<MotoStats>(EMPTY_STATS);

  protected readonly motoConfig = signal<MotoConfig>(EMPTY_CONFIG);

  protected async loadData() {
    try {
    this.error.set('');
    const [statsData, config] = await Promise.all([this.motosApi.getMotosStats(this.selectedYear()), this.motosApi.getMotoConfiguration()]);
    this.reloadKey.update((key) => key + 1);
    this.stats.set(statsData || {});
    this.motoConfig.set(config || EMPTY_CONFIG);
    }
    catch {
    this.stats.set(EMPTY_STATS);
    this.motoConfig.set(EMPTY_CONFIG);
    this.error.set('Impossible de charger les données des motos.');
    }
    }

  protected showSuccess(message: string, then?: () => void) {
    this.successMessage.set(message);
    setTimeout(() => {
    this.successMessage.set('');
    then?.();
    }, then ? 1000 : 3000);
    }

  protected afterSave(message: string) {
    return async () => {
    this.modal.set(null);
    await this.loadData();
    this.showSuccess(message);
    };
  }

  protected async afterPayment(paymentReceipt: ReceiptData) {
    this.modal.set(null);
    await this.loadData();
    this.showSuccess('Paiement enregistré avec succès !', () => this.receipt.set(paymentReceipt));
    }

  protected async afterRegistration(adhesion?: MotoPayment) {
    this.modal.set(null);
    await this.loadData();
    this.showSuccess('Moto enregistrée, droit d’adhésion encaissé !', adhesion ? () => this.imprimerRecu(toUiMotoPayment(adhesion)) : undefined);
    }

  protected imprimerRecu(paiement: UiMotoPayment) {
    const date = paiement.datePaiement ? new Date(paiement.datePaiement) : new Date();
    this.receipt.set({
    numero: paiement.numeroRecu || '',
    date: date.toLocaleDateString('fr-FR', FULL_DATE),
    heure: date.toLocaleTimeString('fr-FR', SHORT_TIME),
    contribuable: paiement.proprietaire,
    type: libellePaiement(paiement),
    montant: paiement.montant,
    agent: paiement.agent,
    });
    }

  protected readonly tabs = computed(() => [
    ...(this.userRole() === 'admin' ? [] : [{ id: 'liste' as const, label: 'Liste des motos', icon: 'ri-list-check' }]),
    { id: 'paiements', label: 'Paiements récents', icon: 'ri-money-dollar-circle-line' },
    { id: 'retards', label: `Retards (${this.stats().enRetard || 0})`, icon: 'ri-alarm-warning-line' },
    ]);

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.loadData();
      });
    });
  }
}
