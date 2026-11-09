import { ChangeDetectionStrategy, Component, inject, input, output, computed } from '@angular/core';
import { LigneBudgetaire } from '../../../services/budget';
import { BudgetApi } from '../../../services/budget';

const HEADERS: Array<[string, string]> = [
  ['Code', 'text-left'],
  ['Catégorie', 'text-left'],
  ['Budgétisé', 'text-right'],
  ['Dépensé', 'text-right'],
  ['Reste', 'text-right'],
  ['Réalisation', 'text-center'],
  ['Actions', 'text-center'],
];

@Component({
  selector: 'app-budget-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './budget-table.html',
})
export class BudgetTable {
  protected readonly Math = Math;
  protected readonly HEADERS = HEADERS;
  protected readonly budgetApi = inject(BudgetApi);
  readonly lignes = input.required<LigneBudgetaire[]>();

  readonly loading = input.required<boolean>();

  readonly year = input.required<number>();

  readonly busy = input.required<boolean>();

  readonly edit = output<LigneBudgetaire>();

  readonly view = output<LigneBudgetaire>();

  readonly canDelete = input(false);

  readonly delete = output<LigneBudgetaire>();

  protected readonly message = computed(() => this.loading() ? 'Chargement des données...' : this.lignes().length === 0 ? `Aucune ligne budgétaire disponible pour l'année ${this.year()}.` : null);
}
