import { ChangeDetectionStrategy, Component, inject, input, computed } from '@angular/core';
import { HistoriqueDemandes } from './components/historique-demandes';
import { StatistiquesEtatCivil } from './components/statistiques-etat-civil';
import { TraiterDemande } from './components/traiter-demande';
import { Router } from '@angular/router';

type Section = 'nouvelle' | 'a-traiter' | 'historique' | 'statistiques';

const HEADERS: Record<Section, { title: string; subtitle: string }> = {
  nouvelle: { title: 'Nouvelle demande', subtitle: 'Enregistrer une demande de document' },
  'a-traiter': { title: 'Demandes à traiter', subtitle: 'Demandes en attente de délivrance ou de rejet' },
  historique: { title: 'Historique', subtitle: 'Toutes les demandes de l’année sélectionnée' },
  statistiques: { title: 'Statistiques', subtitle: 'Activité et recettes de l’état civil' },
};

@Component({
  selector: 'app-etat-civil-section-page',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TraiterDemande, HistoriqueDemandes, StatistiquesEtatCivil],
  templateUrl: './etat-civil-section-page.html',
})
export class EtatCivilSectionPage {
  protected readonly router = inject(Router);
  readonly section = input.required<Section>();

  protected readonly title = computed(() => (HEADERS[this.section()]).title);

  protected readonly subtitle = computed(() => (HEADERS[this.section()]).subtitle);
}
