import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { GlobalStats, TopAgent, EvolutionJour, TransactionRecente } from '../../../services/statistiques';
import { YearService } from '../../../core/year/year.service';
import { RouterLink } from '@angular/router';
import { StatistiquesApi } from '../../../services/statistiques';

const periodes = ['Aujourd\'hui', 'Cette semaine', 'Ce mois'] as const;

interface FormattedTransaction {
  id: string;
  type: string;
  contribuable: string;
  agent: string;
  montant: number;
  heure: string;
  statut: string;
}

@Component({
  selector: 'app-admin-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  protected readonly periodes = periodes;
  protected readonly Math = Math;
  protected readonly window = window;
  protected readonly yearService = inject(YearService);
  protected readonly statistiquesApi = inject(StatistiquesApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly stats = signal<GlobalStats | null>(null);

  protected readonly loading = signal(true);

  protected readonly error = signal<string | null>(null);

  protected readonly periodeActive = signal<number>(0);

  protected readonly transactionsRecentes = signal<FormattedTransaction[]>([]);

  protected readonly agentsTop = signal<TopAgent[]>([]);

  protected readonly evolutionSemaine = signal<EvolutionJour[]>([]);

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
    change: this.periodeActive() === 0 ? '+12.5%' : this.periodeActive() === 1 ? '+8.2%' : '+15.3%',
    trend: 'up',
    icon: 'ri-money-dollar-circle-line',
    color: 'bg-emerald-50 text-emerald-600'
    },
    {
    title: this.periodeActive() === 0 ? 'Transactions (Jour)' : this.periodeActive() === 1 ? 'Transactions (Sem)' : 'Transactions (Mois)',
    value: this.getTransactionsValue().toString(),
    unit: 'tickets',
    change: this.periodeActive() === 0 ? '+18' : this.periodeActive() === 1 ? '+42' : '+156',
    trend: 'up',
    icon: 'ri-file-list-3-line',
    color: 'bg-emerald-50 text-emerald-600'
    },
    {
    title: 'Contribuables',
    value: this.stats()?.totalContribuables?.toString() || '0',
    unit: 'inscrits',
    change: '+5%',
    trend: 'up',
    icon: 'ri-team-line',
    color: 'bg-cyan-50 text-cyan-600'
    },
    {
    title: 'Taux recouvrement',
    value: this.stats()?.tauxRecouvrement?.toFixed(1) || '0',
    unit: '%',
    change: '+1.8%',
    trend: 'up',
    icon: 'ri-pie-chart-line',
    color: 'bg-amber-50 text-amber-600'
    },
    ]);

  protected readonly totalCategories = computed(() => this.stats()?.categories?.reduce((sum, cat) => sum + (cat.montant || 0), 0) || 0);

  protected readonly modulesRecettes = computed(() => this.stats()?.categories?.map((cat, idx: number) => {
    const colors = ['bg-emerald-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-400'];
    const icons = ['ri-file-list-3-line', 'ri-store-2-line', 'ri-motorbike-line', 'ri-file-text-line', 'ri-building-line'];
    return {
    nom: cat.categorie,
    montant: cat.montant,
    pct: this.totalCategories() > 0 ? Math.round(((cat.montant || 0) / this.totalCategories()) * 100) : 0,
    icon: icons[idx % icons.length],
    barColor: colors[idx % colors.length],
    };
    }) || []);

  protected readonly maxEvol = computed(() => Math.max(...this.evolutionSemaine().map(e => e.montant), 1));

  protected readonly displayAgentsTop = computed(() => this.agentsTop());

  protected readonly validations = computed(() => [
    {
    label: 'État civil',
    count: this.stats()?.stats?.etatCivil?.enAttente || 0,
    icon: 'ri-file-text-line',
    link: '/etat-civil',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
    label: 'Urbanisme',
    count: this.stats()?.stats?.urbanisme?.enAttente || 0,
    icon: 'ri-building-line',
    link: '/urbanisme',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
    label: 'Budget',
    count: this.stats()?.stats?.budget?.enAttente || 0,
    icon: 'ri-bank-card-line',
    link: '/service-finances',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
    label: 'Quai de pêche',
    count: this.stats()?.stats?.quaiPeche?.enAttente || 0,
    icon: 'ri-ship-line',
    link: '/quai-peche/commissions',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    ]);

  protected readonly alertes = computed(() => this.stats()?.alertes?.length
    ? this.stats()!.alertes!.map((alerte) => ({
    message: alerte.message,
    type: alerte.type === 'danger' || alerte.type === 'warning' ? alerte.type : 'info',
    date: alerte.timestamp ? new Date(alerte.timestamp).toLocaleString('fr-FR') : 'À l’instant',
    icon: alerte.type === 'danger'
    ? 'ri-alert-line'
    : alerte.type === 'warning'
    ? 'ri-error-warning-line'
    : 'ri-information-line',
    }))
    : [
    { message: `En attente de validation: ${this.stats()?.stats?.etatCivil?.enAttente || 0} dossiers d'état civil`, type: 'info', date: 'À l’instant', icon: 'ri-file-chart-line' },
    { message: `${this.stats()?.stats?.motos?.enRetard || 0} motos en retard de paiement depuis plus de 30 jours`, type: 'danger', date: 'À l’instant', icon: 'ri-motorbike-line' },
    ]);

  protected readonly raccourcis = computed(() => [
    { label: 'Recettes', icon: 'ri-money-dollar-circle-line', link: '/recettes', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
    { label: 'Taxes', icon: 'ri-file-list-3-line', link: '/taxes', color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
    { label: 'État Civil', icon: 'ri-file-text-line', link: '/etat-civil', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
    { label: 'Urbanisme', icon: 'ri-building-line', link: '/urbanisme', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
    { label: 'Marché', icon: 'ri-store-2-line', link: '/marche', color: 'bg-sky-50 text-sky-600 hover:bg-sky-100' },
    { label: 'Motos', icon: 'ri-motorbike-line', link: '/motos', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
    { label: 'Rapports', icon: 'ri-bar-chart-box-line', link: '/rapports', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
    ]);

  protected evolutionSemaineSummary() {
    return (this.evolutionSemaine().reduce((s, e) => s + e.montant, 0) / 1000000).toFixed(1);
  }

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    const loadStats = async () => {
    try {
    this.loading.set(true);
    this.error.set(null);
    const data = await this.statistiquesApi.getGlobalStats(this.selectedYear());
    this.stats.set(data);
    if (data?.transactionsRecentes) {
    const formattedTransactions = data.transactionsRecentes.map((tx: TransactionRecente) => ({
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
    initiales: agent.initiale || (agent.nom ? agent.nom[0] : '?')
    }));
    this.agentsTop.set(formattedAgents);
    }
    if (data?.evolutionSemaine) {
    this.evolutionSemaine.set(data.evolutionSemaine);
    }
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
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
