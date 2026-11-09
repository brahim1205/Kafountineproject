import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { YearService } from '../../core/year/year.service';
import { FicheContribuable, RecouvrementApi, Situation } from '../../services/recouvrement';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { serverList } from '../../shared/utils/server-list';
import { getErrorMessage } from '../../utils/form-validation';

@Component({
  selector: 'app-contribuables',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination],
  templateUrl: './page.html',
})
export class Contribuables {
  private readonly api = inject(RecouvrementApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly yearService = inject(YearService);

  protected readonly selectionId = signal<string | null>(this.route.snapshot.queryParamMap.get('id'));
  protected readonly situation = signal<Situation | null>(null);
  protected readonly erreur = signal('');
  protected readonly sources = computed(() => Object.entries(this.situation()?.parSource ?? {}));

  protected readonly list = serverList<FicheContribuable>(async ({ page, limit, search }) => {
    const { data, meta } = await this.api.rechercher(search, page, limit);
    return { data, meta };
  }, computed(() => []), { pageSize: 20 });

  constructor() {
    effect(() => {
      const id = this.selectionId();
      const year = this.yearService.selectedYear();
      untracked(() => void this.charger(id, year));
    });
  }

  private async charger(id: string | null, year: number): Promise<void> {
    this.situation.set(null);
    this.erreur.set('');
    if (!id) return;
    try {
      this.situation.set(await this.api.situation(id, year));
    } catch (error) {
      this.erreur.set(getErrorMessage(error, 'Impossible de charger la situation de ce contribuable.'));
    }
  }

  protected montant(value: number): string {
    return `${value.toLocaleString('fr-FR')} FCFA`;
  }

  protected date(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR');
  }
}
