import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { TopAgent } from '../../../services/statistiques';
import { YearService } from '../../../core/year/year.service';
import { StatistiquesApi } from '../../../services/statistiques';

type AgentPerformanceItem = {
  name: string;
  initials: string;
  amount: number;
  transactions: number;
};

@Component({
  selector: 'app-agent-performance',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './agent-performance.html',
})
export class AgentPerformance {
  protected readonly yearService = inject(YearService);
  protected readonly statistiquesApi = inject(StatistiquesApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly agents = signal<AgentPerformanceItem[]>([]);

  protected readonly loading = signal(true);

  protected readonly errorMsg = signal('');

  protected readonly colors = computed(() => ['bg-emerald-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500']);

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    const loadAgents = async () => {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    const data = await this.statistiquesApi.getGlobalStats(this.selectedYear());
    if (data?.topAgents && Array.isArray(data.topAgents)) {
    const formattedAgents = data.topAgents.map((agent: TopAgent): AgentPerformanceItem => ({
    name: `${agent.prenom || ''} ${agent.nom || ''}`.trim(),
    initials: agent.initiale || (agent.nom ? agent.nom[0] : '?'),
    amount: agent.collecte || 0,
    transactions: agent.transactions || 0
    }));
    this.agents.set(formattedAgents);
    }
    else {
    this.agents.set([]);
    }
    }
    catch {
    this.agents.set([]);
    this.errorMsg.set("Impossible de charger les performances des agents.");
    }
    finally {
    this.loading.set(false);
    }
    };
    loadAgents();
      });
    });
  }
}
