import { apiRequest } from './api';

const MAX_TRANSACTIONS_LIMIT = 300;

function clampTransactionsLimit(limit?: number): number | undefined {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return undefined;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_TRANSACTIONS_LIMIT);
}

export type TaxCategory = {
  id: string;
  nom: string;
  icon?: string;
  color?: string;
  description?: string;
};

export type TaxService = {
  id: string;
  nom: string;
  tarif: number;
  unite: string;
  calcul?: string | null;
};

export type TransactionItem = {
  id: string;
  numero: string;
  type?: string;
  categorie: string;
  service: string;
  quantite: number;
  montant: number;
  modePaiement: string;
  statut: string;
  date: string;
  createdAt?: string;
  heure?: string;
  contribuableNom?: string;
  contribuable?: {
    id: string;
    nom: string;
    prenom: string;
    nin: string;
    telephone?: string;
  };
  agent?: {
    id: string;
    nom: string;
    prenom: string;
    role?: string;
  };
};

export type TransactionCategoryStat = {
  nom: string;
  montant: number;
  pourcentage: number;
};

export type TransactionPeriodStats = {
  total: number;
  transactions: number;
  categories: TransactionCategoryStat[];
};

export type TransactionStats = {
  aujourdhui: TransactionPeriodStats;
  mois: TransactionPeriodStats;
  annee: TransactionPeriodStats;
};

export async function getTaxCategories(): Promise<TaxCategory[]> {
  return apiRequest<TaxCategory[]>('/transactions/categories');
}

export async function getTaxServices(categoryId: string): Promise<TaxService[]> {
  return apiRequest<TaxService[]>(`/transactions/categories/${categoryId}/services`);
}

export async function getTransactions(params: {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  categorie?: string;
  statut?: string;
  year?: number;
} = {}): Promise<{ data: TransactionItem[]; total?: number }> {
  const query = new URLSearchParams();
  const limit = clampTransactionsLimit(params.limit);
  if (params.page) query.set('page', String(params.page));
  if (limit) query.set('limit', String(limit));
  if (params.search) query.set('search', params.search);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.categorie) query.set('categorie', params.categorie);
  if (params.statut) query.set('statut', params.statut);
  if (params.year) query.set('year', String(params.year));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await apiRequest<TransactionItem[]>(`/transactions${suffix}`);
  return { data: Array.isArray(data) ? data : [] };
}

export async function getTransactionStats(year?: number): Promise<TransactionStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<TransactionStats>(`/transactions/statistiques${query}`);
}

export async function createTransaction(payload: {
  contribuableId: string;
  categorie: string;
  type: string;
  service: string;
  quantite: number;
  montant: number;
  modePaiement: string;
  reference: string;
}): Promise<TransactionItem> {
  return apiRequest<TransactionItem>('/transactions', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updateTransaction(id: string, payload: {
  contribuableId?: string;
  type?: string;
  montant?: number;
}): Promise<TransactionItem> {
  return apiRequest<TransactionItem>(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return apiRequest<void>(`/transactions/${id}`, {
    method: 'DELETE',
  });
}
