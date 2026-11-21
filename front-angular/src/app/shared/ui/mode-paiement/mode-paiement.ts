import { ChangeDetectionStrategy, Component, model } from '@angular/core';

export const MODES_PAIEMENT = [
  { value: 'ESPECE', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (Wave, Orange Money…)' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT', label: 'Virement' },
] as const;

export function libelleMode(mode: string): string {
  return MODES_PAIEMENT.find((item) => item.value === mode)?.label.replace(/ \(.*$/, '') ?? mode;
}

/** Choix du mode de paiement, commun à tous les formulaires. */
@Component({
  selector: 'app-mode-paiement',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label for="mode-paiement" class="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
    <select id="mode-paiement" [value]="value()" (change)="value.set($any($event.target).value)"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer">
      @for (mode of modes; track mode.value) {
        <option [value]="mode.value">{{ mode.label }}</option>
      }
    </select>
  `,
})
export class ModePaiement {
  readonly value = model('ESPECE');
  protected readonly modes = MODES_PAIEMENT;
}
