import { apiRequest } from './api';
import { getTransactions } from './taxes';
import type { GlobalStats } from './statistiques';
import type { TransactionItem } from './taxes';

type ReportTxStats = {
  aujourdhui?: { total?: number; transactions?: number };
  mois?: { total?: number; transactions?: number };
  annee?: { total?: number; transactions?: number };
};

type ReportMotosStats = {
  total?: number;
  enRetard?: number;
  recettesMois?: number;
  recettesAnnee?: number;
  tauxPaiement?: number;
};

type ReportMarcheStats = {
  placesTotales?: number;
  placesOccupees?: number;
  placesDisponibles?: number;
  recettesMois?: number;
  tauxOccupation?: number;
};

type ReportEtatCivilStats = {
  totalDemandes?: number;
  enAttente?: number;
  delivrees?: number;
  recettes?: number;
};

type ReportUrbanismeStats = {
  totalDossiers?: number;
  total?: number;
  enAttente?: number;
  valide?: number;
  valides?: number;
  recettes?: number;
};

type ReportFormationsStats = {
  totalFormations?: number;
  totalJeunes?: number;
  certifies?: number;
};

export type ReportsOverview = {
  txStats: ReportTxStats;
  motosStats: ReportMotosStats;
  marcheStats: ReportMarcheStats;
  etatCivilStats: {
    totalDemandes: number;
    demandesEnAttente: number;
    demandesDelivrees: number;
    recettes: number;
  };
  urbanismeStats: {
    totalDossiers: number;
    dossiersEnAttente: number;
    dossiersValides: number;
    recettes: number;
  };
  formationsStats: {
    totalFormations: number;
    totalJeunesFormes: number;
    totalCertifies: number;
    budgetTotal: number;
  };
  totalContribuables: number;
  evolutionSemaine: NonNullable<GlobalStats['evolutionSemaine']>;
  transactionsRecentes: NonNullable<GlobalStats['transactionsRecentes']>;
  topAgents: NonNullable<GlobalStats['topAgents']>;
};

export async function getReportsOverview(year?: number): Promise<ReportsOverview> {
  const query = year ? `?year=${year}` : '';
  const [[txStats, motosStats, marcheStats, etatCivilStats, urbanismeStats, formationsStats], dashboardStats] = await Promise.all([
    Promise.all([
      apiRequest<ReportTxStats>(`/transactions/statistiques${query}`),
      apiRequest<ReportMotosStats>(`/motos/statistiques${query}`),
      apiRequest<ReportMarcheStats>(`/marche/statistiques${query}`),
      apiRequest<ReportEtatCivilStats>(`/etat-civil/statistiques${query}`),
      apiRequest<ReportUrbanismeStats>(`/urbanisme/statistiques${query}`),
      apiRequest<ReportFormationsStats>(`/formations/statistiques${query}`),
    ]),
    apiRequest<GlobalStats>(`/dashboard/statistiques${query}`).catch(() => ({
      totalContribuables: 0,
      totalRecettes: 0,
      totalFormations: 0,
      transactionsAujourdhui: 0,
      transactionsMois: 0,
      recettesAujourdhui: 0,
      recettesMois: 0,
      tauxRecouvrement: 0,
      stats: {
        motos: { total: 0, enRetard: 0 },
        marche: { total: 0, occupees: 0 },
        etatCivil: { enAttente: 0 },
        urbanisme: { enAttente: 0 },
        budget: { enAttente: 0 },
        quaiPeche: { enAttente: 0 },
        validations: { total: 0 },
      },
      categories: [],
      evolutionSemaine: [],
      transactionsRecentes: [],
      topAgents: [],
    })),
  ]);

  return {
    txStats,
    motosStats,
    marcheStats,
    etatCivilStats: {
      totalDemandes: etatCivilStats?.totalDemandes || 0,
      demandesEnAttente: etatCivilStats?.enAttente || 0,
      demandesDelivrees: etatCivilStats?.delivrees || 0,
      recettes: etatCivilStats?.recettes || 0,
    },
    urbanismeStats: {
      totalDossiers: urbanismeStats?.totalDossiers || urbanismeStats?.total || 0,
      dossiersEnAttente: urbanismeStats?.enAttente || 0,
      dossiersValides: urbanismeStats?.valide || urbanismeStats?.valides || 0,
      recettes: urbanismeStats?.recettes || 0,
    },
    formationsStats: {
      totalFormations: formationsStats?.totalFormations || 0,
      totalJeunesFormes: formationsStats?.totalJeunes || 0,
      totalCertifies: formationsStats?.certifies || 0,
      budgetTotal: 0,
    },
    totalContribuables: dashboardStats?.totalContribuables || 0,
    evolutionSemaine: dashboardStats?.evolutionSemaine || [],
    transactionsRecentes: dashboardStats?.transactionsRecentes || [],
    topAgents: dashboardStats?.topAgents || [],
  };
}

export async function getReportTransactions(limit = 500, year?: number): Promise<TransactionItem[]> {
  const selectedYear = year || new Date().getFullYear();
  const response = await getTransactions({ page: 1, limit, year: selectedYear });
  return Array.isArray(response?.data) ? response.data : [];
}
