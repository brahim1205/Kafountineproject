import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { RecuPDF } from '../../../components/feature/recu-pdf';
import { TransactionItem } from '../../../services/taxes';
import { YearService } from '../../../core/year/year.service';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TaxesApi } from '../../../services/taxes';
import { MotosApi } from '../../../services/motos';
import { UrbanismeApi } from '../../../services/urbanisme';
import { MarcheApi } from '../../../services/marche';

type AgentCollecte = {
  id: string;
  type: string;
  contribuable: string;
  montant: number;
  heure: string;
  date: string;
};

type ReceiptData = {
  ticketNumber: string;
  date: string;
  time: string;
  contributor: string;
  type: string;
  amount: number;
  agent: string;
};

const DAY_LIST_LIMIT = 300;

const toCollecte = (t: TransactionItem): AgentCollecte => {
  const parsed = t.date ? new Date(t.date) : null;
  const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  return {
    id: t.numero || t.id,
    type: t.type || t.service || 'Transaction',
    contribuable: t.contribuable?.prenom ? `${t.contribuable.prenom} ${t.contribuable.nom}` : t.contribuableNom || '-',
    montant: t.montant || 0,
    heure: valid ? valid.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
    date: valid ? valid.toISOString().slice(0, 10) : '',
  };
};

@Component({
  selector: 'app-agent-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RecuPDF],
  templateUrl: './agent-dashboard.html',
})
export class AgentDashboard {
  protected readonly Math = Math;
  protected readonly yearService = inject(YearService);
  protected readonly auth = inject(AuthService);
  protected readonly taxesApi = inject(TaxesApi);
  protected readonly motosApi = inject(MotosApi);
  protected readonly urbanismeApi = inject(UrbanismeApi);
  protected readonly marcheApi = inject(MarcheApi);
  protected readonly showRecuModal = signal(false);

  protected readonly selectedRecu = signal<ReceiptData | null>(null);

  protected readonly loading = signal(true);

  protected readonly mesCollectes = signal<AgentCollecte[]>([]);

  protected readonly totalJour = signal(0);

  protected readonly nombreJour = signal(0);

  protected readonly resumeLabel = signal("Voici le résumé de votre journée de collecte");

  protected readonly tachesCounts = signal({
    motos: 0,
    urbanisme: 0,
    marche: 0,
    });

  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly currentYear = computed(() => new Date().getFullYear());

  protected readonly isCurrentYear = computed(() => this.selectedYear() === this.currentYear());

  protected readonly agentName = computed(() => this.auth.userName() || '');

  protected readonly agentId = computed(() => this.auth.userId());

  protected readonly tachesEnCours = computed(() => [
    { icon: 'ri-motorbike-line', label: 'Motos en retard de paiement', count: this.tachesCounts().motos, color: 'text-red-600 bg-red-50', link: '/motos' },
    { icon: 'ri-building-line', label: 'Dossiers urbanisme en attente', count: this.tachesCounts().urbanisme, color: 'text-sky-600 bg-sky-50', link: '/urbanisme' },
    { icon: 'ri-store-2-line', label: 'Paiements marché à enregistrer', count: this.tachesCounts().marche, color: 'text-emerald-600 bg-emerald-50', link: '/marche' },
    ]);

  /** Tickets enregistrés par l'agent sur le mois civil en cours (aucun objectif n'est fixé par la mairie). */
  protected readonly mois = signal({ montant: 0, nombre: 0 });

  protected handlePrintRecu(collecte: AgentCollecte) {
    this.selectedRecu.set({
    ticketNumber: collecte.id,
    date: collecte.date,
    time: collecte.heure,
    contributor: collecte.contribuable,
    type: collecte.type,
    amount: collecte.montant,
    agent: this.agentName()
    });
    this.showRecuModal.set(true);
    }

  protected setSummary() {
    return new Set(this.mesCollectes().map((c) => c.contribuable)).size.toLocaleString('fr-FR');
  }

  protected tachesEnCoursSummary() {
    return this.tachesEnCours().reduce((s, t) => s + t.count, 0);
  }

  constructor() {
    effect(() => {
      this.selectedYear(); this.agentId();
      untracked(() => {
    const loadData = async () => {
    try {
    this.loading.set(true);
    const todayKey = new Date().toISOString().slice(0, 10);
    const dayOf = (day: string) => this.taxesApi.getTransactions({ agentId: this.agentId() || undefined, year: this.selectedYear(), startDate: day, endDate: day, limit: DAY_LIST_LIMIT });
    try {
    const debutMois = `${todayKey.slice(0, 8)}01`;
    const [todayResult, moisResult, motosStats, urbanismeStats, marcheStats] = await Promise.all([
    this.agentId() ? dayOf(todayKey) : Promise.resolve(null),
    this.agentId() && this.isCurrentYear()
      ? this.taxesApi.getTransactions({ agentId: this.agentId() || undefined, year: this.selectedYear(), startDate: debutMois, endDate: todayKey, limit: 1 }).catch(() => null)
      : Promise.resolve(null),
    this.motosApi.getMotosStats(this.selectedYear()).catch(() => null),
    this.urbanismeApi.getUrbanismeStats(this.selectedYear()).catch(() => null),
    this.marcheApi.getMarcheStats(this.selectedYear()).catch(() => null),
    ]);
    let dayResult = todayResult;
    let dayKey = todayKey;
    if (this.agentId() && todayResult && todayResult.total === 0) {
    const latest = await this.taxesApi.getTransactions({ agentId: this.agentId() ?? undefined, year: this.selectedYear(), limit: 1 });
    const latestDate = latest.data[0]?.date ? new Date(latest.data[0].date) : null;
    if (latestDate && !Number.isNaN(latestDate.getTime())) {
    dayKey = latestDate.toISOString().slice(0, 10);
    dayResult = await dayOf(dayKey);
    }
    }
    if (dayResult && dayResult.total > 0) {
    this.mesCollectes.set(dayResult.data.map(toCollecte));
    this.totalJour.set(dayResult.montantPaye);
    this.nombreJour.set(dayResult.total);
    if (dayKey === todayKey) {
    this.resumeLabel.set("Voici le résumé de votre journée de collecte");
    }
    else {
    this.resumeLabel.set(`Aucune collecte aujourd'hui. Dernière journée avec activité: ${new Date(dayKey).toLocaleDateString('fr-FR')}`);
    }
    }
    else {
    this.mesCollectes.set([]);
    this.totalJour.set(0);
    this.nombreJour.set(0);
    this.resumeLabel.set("Aucune collecte enregistrée pour l'année sélectionnée");
    }
    this.mois.set({ montant: moisResult?.montantPaye || 0, nombre: moisResult?.nombrePaye || 0 });
    this.tachesCounts.set({
    motos: Number(motosStats?.enRetard || 0),
    urbanisme: Number(urbanismeStats?.enAttente || (urbanismeStats as { data?: { enAttente?: number } })?.data?.enAttente || 0),
    marche: Number(marcheStats?.paiementsEnAttente || 0),
    });
    }
    catch {
    this.mesCollectes.set([]);
    this.totalJour.set(0);
    this.resumeLabel.set("Impossible de charger les collectes");
    this.mois.set({ montant: 0, nombre: 0 });
    this.tachesCounts.set({ motos: 0, urbanisme: 0, marche: 0 });
    }
    }
    catch {
    this.mesCollectes.set([]);
    this.totalJour.set(0);
    this.resumeLabel.set("Impossible de charger les collectes");
    this.mois.set({ montant: 0, nombre: 0 });
    this.tachesCounts.set({ motos: 0, urbanisme: 0, marche: 0 });
    }
    finally {
    this.loading.set(false);
    }
    };
    loadData();
      });
    });
  }
}
