import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed } from '@angular/core';
import { MotoPhoto } from './moto-photo';
import { getErrorMessage } from '../../../utils/form-validation';
import { FULL_DATE, SHORT_TIME, libellePaiement, montantDu, MotoConfig, ReceiptData, UiMoto } from '../types';
import { INPUT_CLASS } from './field';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { MotosApi } from '../../../services/motos';
import { ModePaiement } from '../../../shared/ui/mode-paiement/mode-paiement';

@Component({
  selector: 'app-paiement-moto-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MotoPhoto, ModePaiement],
  templateUrl: './paiement-moto-modal.html',
})
export class PaiementMotoModal {
  protected readonly montantDu = montantDu;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly toast = inject(ToastService);
  protected readonly motosApi = inject(MotosApi);
  readonly moto = input.required<UiMoto>();

  readonly motoConfig = input.required<MotoConfig>();

  readonly closed = output<void>();

  readonly paid = output<ReceiptData>();

  protected readonly isSubmitting = signal(false);

  protected readonly modePaiement = signal('ESPECE');

  protected readonly type = signal<'COTISATION' | 'AMENDE_POLICE'>('COTISATION');

  protected readonly now = computed(() => new Date());

  protected readonly amende = computed(() => this.type() === 'AMENDE_POLICE');

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    this.isSubmitting.set(true);
    const reference = String(new FormData((e.currentTarget as HTMLFormElement)).get('reference') || '').trim();
    try {
    const payment = await this.motosApi.createMotoPayment({ motoId: this.moto().id, type: this.type(), modePaiement: this.modePaiement(), reference: reference || undefined });
    await this.paid.emit({
    numero: payment.numeroRecu || '',
    date: this.now().toLocaleDateString('fr-FR', FULL_DATE),
    heure: this.now().toLocaleTimeString('fr-FR', SHORT_TIME),
    contribuable: this.moto().proprietaire.nom,
    type: libellePaiement({ type: this.type(), mois: payment.mois, matricule: this.moto().matricule }) + (!this.amende() && this.moto().enRetard ? ' (avec pénalité)' : ''),
    montant: payment.montant,
    agent: payment.agent || 'Agent Municipal',
    });
    }
    catch (error) {
    this.toast.show(getErrorMessage(error, "Impossible d'enregistrer le paiement."), 'error');
    }
    finally {
    this.isSubmitting.set(false);
    }
    }

  protected typeSummary(e: Event) {
    return this.type.set((e.target as HTMLInputElement).value as 'COTISATION' | 'AMENDE_POLICE');
  }
}
