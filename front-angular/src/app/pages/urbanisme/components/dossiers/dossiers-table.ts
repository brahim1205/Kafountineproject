import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DossierUrbanisme } from '../../../../services/urbanisme';
import { TaxService } from '../../../../services/taxes';
import { formatDate, formatSurface, statut, typeLabel } from './dossiers';

const COLUMNS = ['Numéro', 'Date', 'Demandeur', 'Type', 'Localisation', 'Surface', 'Montant', 'Statut'];

@Component({
  selector: 'app-dossiers-table',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './dossiers-table.html',
})
export class DossiersTable {
  protected readonly COLUMNS = COLUMNS;
  protected readonly formatDate = formatDate;
  protected readonly formatSurface = formatSurface;
  protected readonly typeLabel = typeLabel;

  readonly dossiers = input.required<DossierUrbanisme[]>();

  readonly types = input.required<TaxService[]>();

  readonly loading = input.required<boolean>();

  readonly view = output<DossierUrbanisme>();

  protected statutOf(dossier: DossierUrbanisme) {
    return statut(dossier.statut);
  }

  protected demandeurOf(dossier: DossierUrbanisme) {
    return dossier.contribuable ? `${dossier.contribuable.prenom} ${dossier.contribuable.nom}` : '-';
  }
}
