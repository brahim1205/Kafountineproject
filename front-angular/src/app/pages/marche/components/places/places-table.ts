import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatTarif, statutBadge, UiPlace } from './places';

const COLUMNS = ['Numéro', 'Type', 'Zone', 'Occupant', 'Activité', 'Tarif', 'Statut'];

@Component({
  selector: 'app-places-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './places-table.html',
})
export class PlacesTable {
  protected readonly COLUMNS = COLUMNS;
  protected readonly formatTarif = formatTarif;
  protected readonly statutBadge = statutBadge;

  readonly places = input.required<UiPlace[]>();

  readonly canManage = input.required<boolean>();

  readonly detail = output<UiPlace>();

  readonly attribuer = output<UiPlace>();

  readonly resilier = output<UiPlace>();
}
