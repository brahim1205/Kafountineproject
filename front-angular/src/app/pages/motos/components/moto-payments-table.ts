import { ChangeDetectionStrategy, Component, inject, input, output, computed, effect, signal, untracked } from '@angular/core';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { LIBELLES_PAIEMENT, formatDate, toUiMotoPayment, UiMotoPayment } from '../types';
import { serverList } from '../../../shared/utils/server-list';
import { MotosApi } from '../../../services/motos';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AnnulationModal } from '../../../shared/ui/annulation-modal/annulation-modal';
import { getErrorMessage } from '../../../utils/form-validation';

const COLUMNS = ['N° Reçu', 'Type', 'Matricule', 'Propriétaire', 'Mois', 'Montant', 'Date', 'Agent', 'Statut'];

@Component({
  selector: 'app-moto-payments-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination, AnnulationModal],
  templateUrl: './moto-payments-table.html',
})
export class MotoPaymentsTable {
  protected readonly COLUMNS = COLUMNS;
  protected readonly LIBELLES_PAIEMENT = LIBELLES_PAIEMENT;
  protected readonly formatDate = formatDate;
  protected readonly motosApi = inject(MotosApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly peutAnnuler = computed(() => this.auth.role() === 'super_admin' || this.auth.role() === 'regisseur');
  protected readonly aAnnuler = signal<UiMotoPayment | null>(null);
  protected readonly busy = signal(false);

  readonly year = input.required<number>();

  readonly reloadKey = input.required<number>();

  readonly canManage = input.required<boolean>();

  readonly imprimerRecu = output<UiMotoPayment>();

  protected readonly list = serverList(async ({ page, limit }) => {
    const { data, meta } = await this.motosApi.pageMotoPayments({ year: this.year(), page, limit });
    return { data: data.map(toUiMotoPayment), meta };
    }, computed(() => [this.year()]), { pageSize: 25 });

  protected async annuler(motif: string): Promise<void> {
    const paiement = this.aAnnuler();
    if (!paiement) return;
    this.busy.set(true);
    try {
      await this.motosApi.annulerMotoPayment(paiement.id, motif);
      this.toast.show('Paiement annulé.', 'success');
      this.aAnnuler.set(null);
      this.list.reload();
    } catch (error) {
      this.toast.show(getErrorMessage(error, "Impossible d'annuler ce paiement."), 'error');
    } finally {
      this.busy.set(false);
    }
  }

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
