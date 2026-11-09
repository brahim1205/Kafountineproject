import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { Modal } from '../../../components/feature/modal';
import { RecetteRow } from '../types';

@Component({
  selector: 'app-ticket-detail-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal],
  templateUrl: './ticket-detail-modal.html',
})
export class TicketDetailModal {

  readonly row = input.required<RecetteRow>();

  readonly closed = output<void>();

  readonly print = output<RecetteRow>();

  protected readonly items = computed(() => [
    ['N° Ticket', this.row().ticketNumber],
    ['Type', this.row().type],
    ['Contribuable', this.row().contributor],
    ['Agent', this.row().agent],
    ['Montant', `${this.row().amount.toLocaleString('fr-FR')} FCFA`],
    ['Date', `${this.row().date} ${this.row().time}`],
    ]);
}
