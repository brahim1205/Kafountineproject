import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { Tarif } from '../../../services/settings';
import { PRIMARY_BUTTON } from './ui';
import { SectionHeader } from './section-header';

const COLUMNS = ['Catégorie', 'Nom du tarif', 'Montant', 'Unité', 'Statut'];

@Component({
  selector: 'app-tarifs-tab',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeader],
  templateUrl: './tarifs-tab.html',
})
export class TarifsTab {
  protected readonly PRIMARY_BUTTON = PRIMARY_BUTTON;

  readonly tarifs = input.required<Tarif[]>();

  readonly add = output<void>();

  readonly edit = output<Tarif>();

  readonly delete = output<Tarif>();

  readonly readOnly = input<boolean>(false);

  protected readonly columns = computed(() => this.readOnly() ? COLUMNS : [...COLUMNS, 'Actions']);
}
