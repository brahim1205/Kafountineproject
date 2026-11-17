import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';
import { PageMeta } from '../core/api/api.models';

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

export type TransactionQuery = {
  search?: string;
  /** Date de paiement, AAAA-MM-JJ, bornes incluses. */
  startDate?: string;
  endDate?: string;
  categorie?: string;
  statut?: string;
  year?: number;
  agentId?: string;
};

function transactionQuery(params: TransactionQuery & { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  const limit = clampTransactionsLimit(params.limit);
  if (params.page) query.set('page', String(params.page));
  if (limit) query.set('limit', String(limit));
  for (const key of ['search', 'startDate', 'endDate', 'categorie', 'statut', 'agentId'] as const) {
    if (params[key]) query.set(key, String(params[key]));
  }
  if (params.year) query.set('year', String(params.year));
  return query.toString() ? `?${query.toString()}` : '';
}

export type UsedCategory = { valeur: string; libelle: string; nombre: number };

@Injectable({ providedIn: 'root' })
export class TaxesApi {
  private readonly api = inject(ApiService);


  async getTaxCategories(): Promise<TaxCategory[]> {
  return this.api.request<TaxCategory[]>('/transactions/categories');
}

  async getTaxServices(categoryId: string): Promise<TaxService[]> {
  return this.api.request<TaxService[]>(`/transactions/categories/${categoryId}/services`);
}

  async getTransactions(params: TransactionQuery & { page?: number; limit?: number } = {}): Promise<{ data: TransactionItem[]; total: number; montantPaye: number; nombrePaye: number; meta?: PageMeta }> {
  const { data, meta } = await this.api.requestWithMeta<TransactionItem[]>(`/transactions${transactionQuery(params)}`);
  const rows = Array.isArray(data) ? data : [];
  return { data: rows, total: meta?.total ?? rows.length, montantPaye: meta?.montantPaye ?? 0, nombrePaye: meta?.nombrePaye ?? 0, meta };
}

  async getUsedCategories(year: number): Promise<UsedCategory[]> {
  return this.api.request<UsedCategory[]>(`/transactions/categories-utilisees?year=${year}`);
}

  async downloadTransactionsCsv(params: TransactionQuery & { year: number }) {
  await this.api.download(`/transactions/export${transactionQuery(params)}`, `tickets_${params.year}.csv`);
}

  async getTransactionStats(year?: number): Promise<TransactionStats> {
  const query = year ? `?year=${year}` : '';
  return this.api.request<TransactionStats>(`/transactions/statistiques${query}`);
}

  async createTransaction(payload: {
  contribuableId: string;
  categorie: string;
  type: string;
  service: string;
  quantite: number;
  montant: number;
  modePaiement: string;
  reference?: string;
}): Promise<TransactionItem> {
  return this.api.request<TransactionItem>('/transactions', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async updateTransaction(id: string, payload: {
  contribuableId?: string;
  type?: string;
  montant?: number;
}): Promise<TransactionItem> {
  return this.api.request<TransactionItem>(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deleteTransaction(id: string): Promise<void> {
  return this.api.request<void>(`/transactions/${id}`, {
    method: 'DELETE',
  });
}
}
