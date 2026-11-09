import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { RecetteRow } from '../types';

const HEADERS = ['N° Ticket', 'Type', 'Contribuable', 'Agent', 'Montant', 'Date & Heure'];

const ACTION_CLASS = 'w-8 h-8 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer';

@Component({
  selector: 'app-recettes-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './recettes-table.html',
})
export class RecettesTable {
  protected readonly HEADERS = HEADERS;
  protected readonly ACTION_CLASS = ACTION_CLASS;

  readonly footerSlot = input(false);

  readonly rows = input.required<RecetteRow[]>();

  readonly loading = input.required<boolean>();

  readonly canEdit = input.required<boolean>();

  readonly edit = output<RecetteRow>();

  readonly print = output<RecetteRow>();

  readonly view = output<RecetteRow>();

  protected readonly message = computed(() => this.loading() ? 'Chargement des recettes...' : this.rows().length === 0 ? 'Aucune recette pour cette sélection.' : null);
}
