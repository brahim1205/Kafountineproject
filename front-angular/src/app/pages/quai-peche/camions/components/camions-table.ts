import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CamionFrigorifique } from '../../../../services/quai-peche';
import { STATUTS_CAMION, formatKg } from './statuts';
import { StatutBadge } from './statut-badge';

const COLUMNS = ['Immatriculation', 'Marque', 'Modèle', 'Capacité', 'Chauffeur', 'Téléphone', 'Expéditions', 'Statut'];

@Component({
  selector: 'app-camions-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatutBadge],
  templateUrl: './camions-table.html',
})
export class CamionsTable {
  protected readonly COLUMNS = COLUMNS;
  protected readonly STATUTS_CAMION = STATUTS_CAMION;
  protected readonly formatKg = formatKg;

  readonly camions = input.required<CamionFrigorifique[]>();

  readonly loading = input.required<boolean>();

  readonly canManage = input.required<boolean>();

  readonly view = output<CamionFrigorifique>();

  readonly delete = output<CamionFrigorifique>();
}
