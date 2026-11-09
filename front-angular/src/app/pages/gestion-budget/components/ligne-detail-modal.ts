import { ChangeDetectionStrategy, Component, inject, input, output, computed } from '@angular/core';
import { Modal } from '../../../components/feature/modal';
import { LigneBudgetaire } from '../../../services/budget';
import { BudgetApi } from '../../../services/budget';

@Component({
  selector: 'app-ligne-detail-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal],
  templateUrl: './ligne-detail-modal.html',
})
export class LigneDetailModal {
  protected readonly budgetApi = inject(BudgetApi);
  readonly ligne = input.required<LigneBudgetaire>();

  readonly closed = output<void>();

  protected readonly reste = computed(() => this.ligne().prevu - this.ligne().depense);

  protected readonly realise = computed(() => this.budgetApi.tauxRealisation(this.ligne()));

  protected readonly items = computed(() => [
    ['Code', this.ligne().code, 'text-gray-900'],
    ['Catégorie', this.ligne().libelle, 'text-gray-900'],
    ['Budgétisé', `${this.ligne().prevu.toLocaleString('fr-FR')} FCFA`, 'text-gray-900'],
    ['Dépensé', `${this.ligne().depense.toLocaleString('fr-FR')} FCFA`, 'text-gray-900'],
    ['Reste', `${this.reste().toLocaleString('fr-FR')} FCFA`, this.reste() >= 0 ? 'text-green-600' : 'text-red-600'],
    ['Réalisation', `${this.realise()}%`, this.realise() > 100 ? 'text-red-600' : 'text-emerald-600'],
    ]);
}
