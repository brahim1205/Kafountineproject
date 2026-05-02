import { apiRequest } from './api';
import { listContribuables, type Contribuable } from './contribuables';
import { getTransactions, type TransactionItem } from './taxes';
import { resolveApiBaseUrl } from './apiBaseUrl';

const API_BASE_URL = resolveApiBaseUrl();

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
  const result = await getTransactions({
    search: query || undefined,
    categorie: filters?.categorie,
    statut: filters?.statut,
    year: filters?.year,
    limit: filters?.limit,
  });

  const filteredByAgent = filters?.agentId
    ? result.data.filter((item) => item.agent?.id === filters.agentId)
    : result.data;

  const filteredByDate = filteredByAgent.filter((item) => {
    if (!filters?.startDate && !filters?.endDate) {
      return true;
    }

    if (!item.date) {
      return false;
    }

    const dateValue = new Date(item.date);
    if (Number.isNaN(dateValue.getTime())) {
      return false;
    }

    const dateKey = dateValue.toISOString().slice(0, 10);
    if (filters?.startDate && dateKey < filters.startDate) {
      return false;
    }

    if (filters?.endDate && dateKey > filters.endDate) {
      return false;
    }

    return true;
  });

  return {
    data: filteredByDate,
    total: filteredByDate.length,
  };
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<TransactionItem[]> {
  const result = await searchTransactions('', { startDate, endDate, limit: 300 });
  return result.data;
}

export async function exportTransactions(format: 'pdf' | 'excel', filters?: {
  startDate?: string;
  endDate?: string;
  categorie?: string;
}): Promise<Blob> {
  const params = new URLSearchParams();
  params.set('format', format);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.categorie) params.set('categorie', filters.categorie);
  
  const response = await fetch(`${API_BASE_URL}/transactions/export?${params.toString()}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.message || 'Erreur lors de l\'export');
  }
  
  return response.blob();
}
