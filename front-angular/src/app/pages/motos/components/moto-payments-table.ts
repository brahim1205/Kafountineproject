import { ChangeDetectionStrategy, Component, inject, input, output, computed, effect, untracked } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { LIBELLES_PAIEMENT, formatDate, toUiMotoPayment, UiMotoPayment } from '../types';
import { serverList } from '../../../shared/utils/server-list';
import { MotosApi } from '../../../services/motos';

const COLUMNS = ['N° Reçu', 'Type', 'Matricule', 'Propriétaire', 'Mois', 'Montant', 'Date', 'Agent'];

@Component({
  selector: 'app-moto-payments-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination],
  templateUrl: './moto-payments-table.html',
})
export class MotoPaymentsTable {
  protected readonly COLUMNS = COLUMNS;
  protected readonly LIBELLES_PAIEMENT = LIBELLES_PAIEMENT;
  protected readonly formatDate = formatDate;
  protected readonly motosApi = inject(MotosApi);
  readonly year = input.required<number>();

  readonly reloadKey = input.required<number>();

  readonly canManage = input.required<boolean>();

  readonly imprimerRecu = output<UiMotoPayment>();

  protected readonly list = serverList(async ({ page, limit }) => {
    const { data, meta } = await this.motosApi.pageMotoPayments({ year: this.year(), page, limit });
    return { data: data.map(toUiMotoPayment), meta };
    }, computed(() => [this.year()]), { pageSize: 25 });

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
