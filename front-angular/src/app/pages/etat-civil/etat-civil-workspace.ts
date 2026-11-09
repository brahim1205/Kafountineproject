import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { TraiterDemande } from './components/traiter-demande';
import { HistoriqueDemandes } from './components/historique-demandes';
import { StatistiquesEtatCivil } from './components/statistiques-etat-civil';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-etat-civil-workspace',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HistoriqueDemandes, StatistiquesEtatCivil, TraiterDemande],
  templateUrl: './etat-civil-workspace.html',
})
export class EtatCivilWorkspace {
  protected readonly auth = inject(AuthService);
  protected readonly showHistorique = computed(() => this.auth.role() !== 'admin');

  protected readonly refreshKey = signal(0);

  protected readonly activeTab = signal<'historique' | 'statistiques'>(this.showHistorique() ? 'historique' : 'statistiques');

  protected readonly showNouvelleDemande = signal(false);

  protected refreshKeySummary() {
    return this.refreshKey.update((key) => key + 1);
  }
}
