import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { EtatCivilStats } from '../../../services/etat-civil';
import { HistoriqueDemandes } from '../../etat-civil/components/historique-demandes';
import { YearService } from '../../../core/year/year.service';
import { EtatCivilApi } from '../../../services/etat-civil';

const ACTIONS = [
  { label: 'Nouvelle demande', icon: 'ri-file-add-line', to: '/etat-civil/nouvelle', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { label: 'Anciens tickets', icon: 'ri-file-list-3-line', to: '/taxes/etat-civil', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { label: 'Historique', icon: 'ri-history-line', to: '/etat-civil/historique', color: 'bg-gray-50 text-gray-700 hover:bg-gray-100' },
];

@Component({
  selector: 'app-etat-civil-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HistoriqueDemandes],
  templateUrl: './etat-civil-dashboard.html',
})
export class EtatCivilDashboard {
  protected readonly Number = Number;
  protected readonly ACTIONS = ACTIONS;
  protected readonly yearService = inject(YearService);
  protected readonly etatCivilApi = inject(EtatCivilApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly stats = signal<EtatCivilStats | null>(null);

  protected load() {
    this.etatCivilApi.getEtatCivilStats(this.selectedYear()).then(value => this.stats.set(value)).catch(() => this.stats.set(null));
    }

  protected readonly cards = computed(() => [
    { label: 'Demandes', value: this.stats()?.totalDemandes, icon: 'ri-file-list-3-line', color: 'text-sky-600 bg-sky-50', to: '/etat-civil/historique' },
    { label: 'À traiter', value: this.stats()?.enAttente, icon: 'ri-time-line', color: 'text-amber-600 bg-amber-50', to: '/etat-civil/a-traiter' },
    { label: 'Validées', value: this.stats()?.validees, icon: 'ri-checkbox-circle-line', color: 'text-emerald-600 bg-emerald-50', to: '/etat-civil/statistiques' },
    ]);

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      
      const cleanup = untracked(() => (this.load)());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
