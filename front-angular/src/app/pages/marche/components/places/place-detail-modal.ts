import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { formatTarif, statutBadge, UiPlace } from './places';

@Component({
  selector: 'app-place-detail-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './place-detail-modal.html',
})
export class PlaceDetailModal {
  protected readonly statutBadge = statutBadge;

  readonly place = input.required<UiPlace>();

  readonly closed = output<void>();

  protected readonly details = computed(() => {
    const place = this.place();
    const rows: [string, string][] = [
      ['Numéro de place', String(place.numero)],
      ['Type', String(place.type)],
      ['Zone', String(place.zone)],
      ['Tarif', formatTarif(place)],
    ];
    if (place.occupantId) {
      rows.push(
        ['Occupant', place.occupant || '-'],
        ['Activité', place.activite || '-'],
        ['Téléphone', place.telephone || '-'],
        ["Date d'attribution", place.dateAttribution ? new Date(place.dateAttribution).toLocaleDateString('fr-FR') : '-'],
      );
    }
    return rows;
  });
}
