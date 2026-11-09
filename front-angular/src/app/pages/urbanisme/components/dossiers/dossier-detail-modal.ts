import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { DossierUrbanisme } from '../../../../services/urbanisme';
import { TaxService } from '../../../../services/taxes';
import { NATURES, formatDate, formatSurface, statut, typeLabel } from './dossiers';

@Component({
  selector: 'app-dossier-detail-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './dossier-detail-modal.html',
})
export class DossierDetailModal {

  readonly dossier = input.required<DossierUrbanisme>();

  readonly types = input.required<TaxService[]>();

  readonly print = output<void>();

  readonly closed = output<void>();

  protected readonly label = computed(() => (statut(this.dossier().statut)).label);

  protected readonly badge = computed(() => (statut(this.dossier().statut)).badge);

  protected readonly c = computed(() => this.dossier().contribuable);

  protected readonly details = computed(() => [
    ['Numéro', this.dossier().numero],
    ['Date de dépôt', formatDate(this.dossier().createdAt)],
    ['Demandeur', this.c() ? `${this.c()!.prenom} ${this.c()!.nom}` : '-'],
    ['Téléphone', this.c()?.telephone || '-'],
    ['Type de permis', typeLabel(this.dossier(), this.types())],
    ['Agent', this.dossier().agent || '-'],
    ['Localisation du projet', this.dossier().localisation || '-', true],
    ['Surface', formatSurface(this.dossier().surface)],
    ['Nature du projet', this.dossier().nature ? NATURES[this.dossier().nature!] || this.dossier().nature : '-'],
    ['Description', this.dossier().description || '-', true],
    ]);
}
