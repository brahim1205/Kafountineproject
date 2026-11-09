import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Expedition } from '../../../../services/quai-peche';
import { STATUTS_EXPEDITION, formatDate, formatFcfa, formatKg } from './statuts';
import { StatutBadge } from './statut-badge';

const COLUMNS = ['N° Expédition', 'Camion', 'Poids', 'Destination', 'Montant', 'Date', 'Statut'];

@Component({
  selector: 'app-expeditions-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatutBadge],
  templateUrl: './expeditions-table.html',
})
export class ExpeditionsTable {
  protected readonly COLUMNS = COLUMNS;
  protected readonly STATUTS_EXPEDITION = STATUTS_EXPEDITION;
  protected readonly formatDate = formatDate;
  protected readonly formatFcfa = formatFcfa;
  protected readonly formatKg = formatKg;

  readonly expeditions = input.required<Expedition[]>();

  readonly loading = input.required<boolean>();

  readonly view = output<Expedition>();
}
