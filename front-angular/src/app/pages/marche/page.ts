import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AttributionPlaces } from './components/attribution-places';
import { SuiviPaiements } from './components/suivi-paiements';
import { StatistiquesMarche } from './components/statistiques-marche';

@Component({
  selector: 'app-marche-page',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AttributionPlaces, SuiviPaiements, StatistiquesMarche],
  templateUrl: './page.html',
})
export class MarchePage {

  protected readonly activeTab = signal<'attribution' | 'paiements' | 'statistiques'>('attribution');
}
