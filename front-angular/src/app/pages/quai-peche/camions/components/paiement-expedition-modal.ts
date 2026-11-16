import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { PayeurField } from '../../../../components/feature/payeur-field';
import { FooterButtons } from '../../../../components/feature/footer-buttons';
import { Modal } from '../../../../components/feature/modal';
import { Expedition, QuaiPecheApi } from '../../../../services/quai-peche';
import { ModePaiement } from '../../../../shared/ui/mode-paiement/mode-paiement';
import { getErrorMessage } from '../../../../utils/form-validation';
import { INPUT_CLASS, formatKg } from './statuts';

/**
 * Tranche de l'arrêté du 8 mai 2024 (section VI), même règle que le serveur : vide ou chargé, puis la capacité
 * du camion (à défaut, le poids chargé). Affichée pour information : le serveur calcule et facture seul.
 */
export function trancheCamion(capaciteKg: number | undefined, poidsKg: number): string | null {
  const reference = capaciteKg && capaciteKg > 0 ? capaciteKg : poidsKg;
  if (!reference || reference <= 0) return null;
  const tonnes = reference / 1000;
  const tranche = tonnes <= 1 ? '0 à 1 tonne' : tonnes <= 10 ? '1 à 10 tonnes' : tonnes <= 20 ? '10 à 20 tonnes' : 'plus de 20 tonnes';
  return `Camion frigo ${poidsKg > 0 ? 'chargé' : 'vide'} (${tranche})`;
}

@Component({
  selector: 'app-paiement-expedition-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, FooterButtons, PayeurField, ModePaiement],
  templateUrl: './paiement-expedition-modal.html',
})
export class PaiementExpeditionModal {
  private readonly quaiPecheApi = inject(QuaiPecheApi);
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly formatKg = formatKg;

  readonly expedition = input.required<Expedition>();
  readonly closed = output<void>();
  readonly paid = output<Expedition>();

  private readonly payeur = viewChild.required(PayeurField);
  protected readonly mode = signal('ESPECE');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly tranche = computed(() => trancheCamion(this.expedition().camion?.capacite, this.expedition().poids));

  protected async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set('');
    try {
      const contribuableId = await this.payeur().resoudre(form);
      if (!contribuableId) return;
      this.paid.emit(await this.quaiPecheApi.payerExpedition(this.expedition().id, { contribuableId, modePaiement: this.mode() }));
    } catch (err) {
      this.error.set(getErrorMessage(err, "La taxe de passage n'a pas pu être enregistrée."));
    } finally {
      this.submitting.set(false);
    }
  }
}
