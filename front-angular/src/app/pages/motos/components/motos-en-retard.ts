import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MotosApi, MotoStats } from '../../../services/motos';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { fetchAllPages, serverList } from '../../../shared/utils/server-list';
import { dateDuJour, exporterLignes, FormatExport } from '../../../utils/export';
import { ExportMenu } from '../../../shared/ui/export-menu/export-menu';
import { formatDate, MotoConfig, toUiMoto, UiMoto } from '../types';
import { MotoPhoto } from './moto-photo';

function exporterRetards(format: FormatExport, motos: UiMoto[]) {
  exporterLignes(format, 'Motos en retard de paiement', `motos-retard-${dateDuJour()}`, [
    ['Matricule', 'Marque', 'Modèle', 'Propriétaire', 'Téléphone', 'Mois dus', 'Jours de retard', 'Montant dû (FCFA)', 'Dernier paiement'],
    ...motos.map((m) => [
      m.matricule,
      m.marque,
      m.modele,
      m.proprietaire?.nom,
      m.proprietaire?.telephone,
      m.moisDus ?? 0,
      m.joursRetard ?? 0,
      m.montantDu ?? 0,
      m.dernierPaiement ? new Date(m.dernierPaiement).toLocaleDateString('fr-FR') : 'Aucun',
    ]),
  ]);
}

/**
 * Motos en retard : synthèse (nombre, somme due), recherche, et liste triée de l'échéance la plus dépassée
 * à la plus récente. Un paiement règle un mois (cotisation + pénalité) ; la somme due couvre tous les mois échus.
 */
@Component({
  selector: 'app-motos-en-retard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MotoPhoto, Pagination, ExportMenu],
  templateUrl: './motos-en-retard.html',
})
export class MotosEnRetard {
  protected readonly formatDate = formatDate;
  private readonly motosApi = inject(MotosApi);

  readonly year = input.required<number>();
  readonly reloadKey = input.required<number>();
  readonly motoConfig = input.required<MotoConfig>();
  readonly canManage = input.required<boolean>();
  readonly paiement = output<UiMoto>();

  protected readonly stats = signal<MotoStats | null>(null);
  protected readonly exporting = signal(false);

  protected readonly list = serverList(async ({ page, limit, search }) => {
    const { data, meta } = await this.motosApi.pageMotos({ year: this.year(), page, limit, search, etat: 'retard' });
    return { data: data.map(toUiMoto), meta };
  }, computed(() => [this.year()]), { pageSize: 20 });

  /** Montant d'un paiement : une cotisation, avec la pénalité puisque la moto est en retard. */
  protected readonly montantPaiement = computed(() => this.motoConfig().tarifMensuel + this.motoConfig().penaliteRetard);

  constructor() {
    effect(() => {
      this.reloadKey();
      const year = this.year();
      untracked(() => {
        if (this.reloadKey()) this.list.reload();
        this.motosApi.getMotosStats(year).then((s) => this.stats.set(s)).catch(() => this.stats.set(null));
      });
    });
  }

  protected montant(value: number | undefined): string {
    return `${Math.round(value ?? 0).toLocaleString('fr-FR')} FCFA`;
  }

  protected nomProprietaire(moto: UiMoto): string {
    return moto.proprietaire?.nom || '-';
  }

  /** Gravité du retard : plus de 3 mois dus en rouge, sinon ambre. */
  protected gravite(moto: UiMoto): string {
    return (moto.moisDus ?? 0) > 3 ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-amber-50 text-amber-800 ring-amber-200';
  }

  protected async exporterTout(format: FormatExport): Promise<void> {
    this.exporting.set(true);
    try {
      const motos = await fetchAllPages((page, limit) => this.motosApi.pageMotos({ year: this.year(), page, limit, etat: 'retard' }));
      exporterRetards(format, motos.map(toUiMoto));
    } finally {
      this.exporting.set(false);
    }
  }
}
