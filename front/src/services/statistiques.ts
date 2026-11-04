import { apiRequest } from './api';
import { listContribuables, type Contribuable } from './contribuables';
import { getTransactions, type TransactionItem } from './taxes';


export interface Agent {
  nom: string;
  prenom: string;
}

export interface TransactionRecente {
  id: string;
  numero: string;
  montant: number;
  type?: string;
  categorie?: string;
  statut?: string;
  createdAt?: string;
  contribuableNom?: string;
  agent?: Agent;
  contribuable?: Contribuable;
}

export interface TopAgent {
  nom: string;
  prenom?: string;
  initiale?: string;
  collecte: number;
  transactions: number;
}

export interface EvolutionJour {
  jour: string;
  montant: number;
}

export interface GlobalStats {
  totalContribuables: number;
  totalRecettes: number;
  totalFormations: number;
  transactionsAujourdhui: number;
  transactionsMois: number;
  recettesAujourdhui: number;
  recettesMois: number;
  tauxRecouvrement: number;
  totalTransactions?: number;
  totalUsers?: number;
  totalAdmins?: number;
  totalAgents?: number;
  totalComptables?: number;
  alertes?: Array<{
    message: string;
    type?: string;
    timestamp?: string;
  }>;
  stats: {
    motos: {
      total: number;
      enRetard: number;
    };
    marche: {
      total: number;
      occupees: number;
    };
    etatCivil: {
      enAttente: number;
    };
    urbanisme: {
      enAttente: number;
    };
    budget: {
      enAttente: number;
    };
    quaiPeche: {
      enAttente: number;
    };
    validations: {
      total: number;
    };
  };
  categories: Array<{
    categorie: string;
    nombre: number;
    montant: number;
  }>;
  transactionsRecentes?: TransactionRecente[];
  topAgents?: Array<{
    nom: string;
    prenom?: string;
    initiale?: string;
    collecte: number;
    transactions: number;
  }>;
  evolutionSemaine?: Array<{
    jour: string;
    montant: number;
    transactions: number;
  }>;
  evolutionMensuelle?: Array<{
    mois: string;
    montant: number;
    transactions: number;
  }>;
}

export async function getGlobalStats(year?: number): Promise<GlobalStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<GlobalStats>(`/dashboard/statistiques${query}`);
}

export async function searchContribuables(query: string): Promise<Contribuable[]> {
  return listContribuables({ search: query, limit: 50 });
}

export async function searchTransactions(query: string, filters?: {
  startDate?: string;
  endDate?: string;
  categorie?: string;
  statut?: string;
  year?: number;
  agentId?: string;
  limit?: number;
}): Promise<{ data: TransactionItem[]; total: number }> {
  // Tous les filtres sont appliqués par le serveur, sur l'ensemble des tickets.
  const result = await getTransactions({
    search: query || undefined,
    categorie: filters?.categorie,
    statut: filters?.statut,
    year: filters?.year,
    agentId: filters?.agentId,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    limit: filters?.limit,
  });

  return { data: result.data, total: result.total };
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<TransactionItem[]> {
  const result = await searchTransactions('', { startDate, endDate, limit: 300 });
  return result.data;
}

