import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TransactionCategoryStat } from '../../../services/taxes';

@Component({
  selector: 'app-recettes-stats',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recettes-stats.html',
})
export class RecettesStats {
  readonly total = input.required<number>();

  readonly count = input.required<number>();

  /** Répartition de l'année par catégorie (vue des responsables) ; vide pour l'agent. */
  readonly categories = input<TransactionCategoryStat[]>([]);

  protected readonly cards = computed(() => [
    { label: 'Total enregistré', value: this.total().toLocaleString('fr-FR'), unit: 'FCFA' },
    { label: 'Tickets payés', value: this.count().toLocaleString('fr-FR'), unit: 'tickets' },
    { label: 'Montant moyen', value: this.count() ? Math.round(this.total() / this.count()).toLocaleString('fr-FR') : '0', unit: 'FCFA par ticket' },
  ]);

  protected readonly repartition = computed(() =>
    [...this.categories()].sort((a, b) => b.montant - a.montant).map((cat) => ({ ...cat, largeur: Math.min(Math.max(cat.pourcentage, 0), 100) })),
  );
}
