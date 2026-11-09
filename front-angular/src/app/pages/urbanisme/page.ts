import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { GestionDossiers } from './components/gestion-dossiers';
import { ValidationDossiers } from './components/validation-dossiers';
import { StatistiquesUrbanisme } from './components/statistiques-urbanisme';

@Component({
  selector: 'app-urbanisme-page',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GestionDossiers, ValidationDossiers, StatistiquesUrbanisme],
  templateUrl: './page.html',
})
export class UrbanismePage {

  protected readonly activeTab = signal<'dossiers' | 'validation' | 'statistiques'>('dossiers');
}
