import { ChangeDetectionStrategy, Component, inject, input, output, computed, effect, untracked } from '@angular/core';
import { MotoPhoto } from './moto-photo';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { fetchAllPages } from '../../../shared/utils/server-list';
import { formatDate, toUiMoto, MotoConfig, UiMoto } from '../types';
import { downloadCsv, today } from '../../../utils/csv';
import { serverList } from '../../../shared/utils/server-list';
import { MotosApi } from '../../../services/motos';

function exportCsv(motos: UiMoto[]) {
  downloadCsv(`motos-retard-${today()}.csv`, [
    ['Matricule', 'Marque', 'Modèle', 'Propriétaire', 'Téléphone', 'Jours de retard', 'Montant pénalité', 'Dernier paiement'],
    ...motos.map((m) => [
      m.matricule,
      m.marque,
      m.modele,
      m.proprietaire?.nom,
      m.proprietaire?.telephone,
      m.joursRetard,
      m.montantPenalite,
      m.dernierPaiement ? new Date(m.dernierPaiement).toLocaleDateString('fr-FR') : 'Aucun',
    ]),
  ]);
}

@Component({
  selector: 'app-motos-en-retard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MotoPhoto, Pagination],
  templateUrl: './motos-en-retard.html',
})
export class MotosEnRetard {
  protected readonly formatDate = formatDate;
  protected readonly motosApi = inject(MotosApi);
  readonly year = input.required<number>();

  readonly reloadKey = input.required<number>();

  readonly motoConfig = input.required<MotoConfig>();

  readonly canManage = input.required<boolean>();

  readonly paiement = output<UiMoto>();

  protected async exporterTout(y: number) {
    const motos = await fetchAllPages((page, limit) => this.motosApi.pageMotos({ year: y, page, limit, etat: 'retard' }));
    exportCsv(motos.map(toUiMoto));
    }

  protected readonly list = serverList(async ({ page, limit }) => {
    const { data, meta } = await this.motosApi.pageMotos({ year: this.year(), page, limit, etat: 'retard' });
    return { data: data.map(toUiMoto), meta };
    }, computed(() => [this.year()]), { pageSize: 24 });

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
