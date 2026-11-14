import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { GlobalStats, TopAgent, EvolutionJour, TransactionRecente } from '../../../services/statistiques';
import { YearService } from '../../../core/year/year.service';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { StatistiquesApi } from '../../../services/statistiques';

const periodes = ['Aujourd\'hui', 'Cette semaine', 'Ce mois'] as const;

type DashboardTransaction = {
  id: string;
  type: string;
  contribuable: string;
  agent: string;
  montant: number;
  heure: string;
  statut: string;
};

type DashboardTopAgent = TopAgent & {
  nom: string;
  initiale?: string;
  initiales?: string;
};

@Component({
  selector: 'app-super-admin-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './super-admin-dashboard.html',
})
export class SuperAdminDashboard {
  protected readonly Math = Math;
  protected readonly periodes = periodes;
  protected readonly yearService = inject(YearService);
  protected readonly auth = inject(AuthService);
  protected readonly statistiquesApi = inject(StatistiquesApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly stats = signal<GlobalStats | null>(null);

  protected readonly loading = signal(true);

  protected readonly periodeActive = signal<number>(0);

  protected readonly transactionsRecentes = signal<DashboardTransaction[]>([]);

  protected readonly agentsTop = signal<DashboardTopAgent[]>([]);

  protected readonly evolutionSemaine = signal<EvolutionJour[]>([]);

  protected readonly errorMsg = signal('');

  protected readonly userName = computed(() => this.auth.userName() || 'Super Administrateur');

  protected getRecettesValue() {
    switch (this.periodeActive()) {
    case 0: return this.stats()?.recettesAujourdhui || 0;
    case 1: return this.stats()?.evolutionSemaine?.reduce((s, e) => s + e.montant, 0) || 0;
    case 2: return this.stats()?.recettesMois || 0;
    default: return 0;
    }
    }

  protected getTransactionsValue() {
    switch (this.periodeActive()) {
    case 0: return this.stats()?.transactionsAujourdhui || 0;
    case 1: return Math.round((this.stats()?.transactionsMois || 0) / 4);
    case 2: return this.stats()?.transactionsMois || 0;
    default: return 0;
    }
    }

  protected readonly statsData = computed(() => [
    {
    title: this.periodeActive() === 0 ? 'Recettes du jour' : this.periodeActive() === 1 ? 'Recettes semaine' : 'Recettes du mois',
    value: (this.getRecettesValue() / 1000).toFixed(0),
    unit: 'KFCFA',
    icon: 'ri-money-dollar-circle-line',
    color: 'bg-purple-50 text-purple-600'
    },
    {
    title: this.periodeActive() === 0 ? 'Transactions (Jour)' : this.periodeActive() === 1 ? 'Transactions (Sem)' : 'Transactions (Mois)',
    value: this.getTransactionsValue().toString(),
    unit: 'tickets',
    icon: 'ri-file-list-3-line',
    color: 'bg-purple-50 text-purple-600'
    },
    {
    title: 'Contribuables',
    value: this.stats()?.totalContribuables?.toString() || '0',
    unit: 'inscrits',
    icon: 'ri-user-line',
    color: 'bg-purple-50 text-purple-600'
    },
    {
    title: 'Taux de recouvrement',
    value: this.stats()?.tauxRecouvrement ? this.stats()!.tauxRecouvrement.toFixed(1) : '0',
    unit: '%',
    icon: 'ri-percent-line',
    color: 'bg-purple-50 text-purple-600'
    },
    ]);

  protected readonly maxMontant = computed(() => Math.max(...this.evolutionSemaine().map(e => e.montant), 1));

  protected readonly totalCategories = computed(() => this.stats()?.categories?.reduce((sum, module) => sum + (module.montant || 0), 0) || 0);

  protected readonly modulesRecettes = computed(() => this.stats()?.categories?.map((module, index: number) => {
    const colors = ['bg-emerald-500', 'bg-cyan-500', 'bg-orange-500', 'bg-amber-500', 'bg-rose-500'];
    return {
    nom: module.categorie,
    montant: module.montant || 0,
    pourcentage: this.totalCategories() > 0 ? Math.round(((module.montant || 0) / this.totalCategories()) * 100) : 0,
    couleur: colors[index % colors.length],
    };
    }) || []);

  protected readonly statsUtilisateurs = computed(() => [
    { label: 'Total utilisateurs', value: String(this.stats()?.totalUsers || 0), icon: 'ri-team-line', color: 'text-indigo-600' },
    { label: 'Administrateurs', value: String(this.stats()?.totalAdmins || 0), icon: 'ri-admin-line', color: 'text-red-600' },
    { label: 'Agents', value: String(this.stats()?.totalAgents || 0), icon: 'ri-user-line', color: 'text-blue-600' },
    ]);

  protected readonly validations = computed(() => [
    { label: 'Urbanisme', value: this.stats()?.stats?.urbanisme?.enAttente || 0, icon: 'ri-building-line', link: '/urbanisme', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { label: 'Budget', value: this.stats()?.stats?.budget?.enAttente || 0, icon: 'ri-bank-card-line', link: '/service-finances', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Quai de pêche', value: this.stats()?.stats?.quaiPeche?.enAttente || 0, icon: 'ri-ship-line', link: '/quai-peche/commissions', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    ]);

  protected evolutionSemaineSummary() {
    return this.evolutionSemaine().reduce((acc, jour) => acc + jour.montant, 0).toLocaleString('fr-FR');
  }

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    const loadStats = async () => {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    const data = await this.statistiquesApi.getGlobalStats(this.selectedYear());
    this.stats.set(data);
    if (data?.transactionsRecentes) {
    const formattedTransactions = data.transactionsRecentes.map((tx: TransactionRecente & {
    type?: string;
    categorie?: string;
    createdAt?: string;
    statut?: string;
    contribuableNom?: string;
    }) => ({
    id: tx.numero || tx.id,
    type: tx.type || tx.categorie || 'Transaction',
    contribuable: tx.contribuable ? `${tx.contribuable.prenom || ''} ${tx.contribuable.nom || ''}`.trim() : tx.contribuableNom || '-',
    agent: tx.agent ? `${tx.agent.prenom || ''} ${tx.agent.nom || ''}`.trim() : '-',
    montant: tx.montant || 0,
    heure: tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
    statut: tx.statut?.toLowerCase() || 'completed'
    }));
    this.transactionsRecentes.set(formattedTransactions);
    }
    if (data?.topAgents) {
    const formattedAgents = data.topAgents.map((agent) => ({
    nom: `${agent.prenom || ''} ${agent.nom || ''}`.trim(),
    collecte: agent.collecte || 0,
    transactions: agent.transactions || 0,
    initiale: agent.initiale || (agent.nom ? agent.nom[0] : '?')
    }));
    this.agentsTop.set(formattedAgents);
    }
    if (data?.evolutionSemaine) {
    this.evolutionSemaine.set(data.evolutionSemaine);
    }
    }
    catch {
    this.stats.set(null);
    this.transactionsRecentes.set([]);
    this.agentsTop.set([]);
    this.evolutionSemaine.set([]);
    this.errorMsg.set("Impossible de charger les statistiques du tableau de bord.");
    }
    finally {
    this.loading.set(false);
    }
    };
    loadStats();
      });
    });
  }
}
