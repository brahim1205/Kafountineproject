import { ChangeDetectionStrategy, Component, inject, input, output, signal, linkedSignal, computed } from '@angular/core';
import { CamionFrigorifique, Expedition } from '../../../../services/quai-peche';
import { INPUT_CLASS, STATUTS_CAMION, STATUTS_EXPEDITION, formatDate, formatFcfa, formatKg } from './statuts';
import { Modal } from '../../../../components/feature/modal';
import { QuaiPecheApi } from '../../../../services/quai-peche';


type DetailItem = CamionFrigorifique & Expedition;

@Component({
  selector: 'app-detail-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal],
  templateUrl: './detail-modal.html',
})
export class DetailModal {
  protected readonly Object = Object;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly STATUTS_EXPEDITION = STATUTS_EXPEDITION;
  protected readonly quaiPecheApi = inject(QuaiPecheApi);
  readonly canManage = input.required<boolean>();

  readonly item = input.required<DetailItem>();

  readonly kind = input.required<'camion' | 'expedition'>();

  readonly changed = output<void>();

  readonly closed = output<void>();

  protected readonly statut = linkedSignal(() => (this.item().statut));

  protected readonly saving = signal(false);

  protected readonly error = signal('');

  protected readonly rows = computed(() => this.kind() === 'camion'
    ? [
    ['Immatriculation', this.item().immatriculation],
    ['Marque', this.item().marque],
    ['Modèle', this.item().modele || '-'],
    ['Capacité', formatKg(this.item().capacite)],
    ['Chauffeur', this.item().chauffeur || '-'],
    ['Téléphone', this.item().telephone || '-'],
    ['Expéditions', String(this.item()._count?.expeditions ?? 0)],
    ['Statut', STATUTS_CAMION[this.item().statut]?.label || this.item().statut],
    ]
    : [
    ['Numéro', this.item().numero],
    ['Camion', this.item().camion?.immatriculation || '-'],
    ['Poids', formatKg(this.item().poids)],
    ['Destination', this.item().destination || '-'],
    ['Montant', formatFcfa(this.item().montant)],
    ['Date', formatDate(this.item().date)],
    ['Observations', this.item().observations || '-'],
    ]);

  protected async enregistrerStatut() {
    this.saving.set(true);
    this.error.set('');
    try {
    await this.quaiPecheApi.updateExpedition(this.item().id, { statut: this.statut() });
    await this.changed.emit();
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : 'Impossible de mettre à jour le statut.');
    }
    finally {
    this.saving.set(false);
    }
    }

  protected readonly editable = computed(() => this.kind() === 'expedition' && this.canManage());
}
