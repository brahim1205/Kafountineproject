import { ChangeDetectionStrategy, Component, inject, input, output, computed, effect, untracked } from '@angular/core';
import { MotoPhoto } from './moto-photo';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { formatDate, toUiMoto, UiMoto } from '../types';
import { serverList } from '../../../shared/utils/server-list';
import { MotosApi } from '../../../services/motos';

@Component({
  selector: 'app-moto-list',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MotoPhoto, Pagination],
  templateUrl: './moto-list.html',
})
export class MotoList {
  protected readonly formatDate = formatDate;
  protected readonly motosApi = inject(MotosApi);
  readonly year = input.required<number>();

  readonly reloadKey = input.required<number>();

  readonly canManage = input.required<boolean>();

  readonly canAdhesion = input.required<boolean>();

  readonly paiement = output<UiMoto>();

  readonly changement = output<UiMoto>();

  protected readonly list = serverList(async ({ page, limit, search, statut }) => {
    const { data, meta } = await this.motosApi.pageMotos({
    year: this.year(),
    page, limit, search,
    etat: statut === 'En retard' ? 'retard' : statut === 'À jour' ? 'ajour' : undefined,
    });
    return { data: data.map(toUiMoto), meta };
    }, computed(() => [this.year()]), { initialStatut: 'Tous', pageSize: 24 });

  constructor() {
    effect(() => {
      this.reloadKey();
      untracked(() => {
    if (this.reloadKey())
    this.list.reload();
      });
    });
  }
}
