import { apiDownload, apiRequest, apiRequestWithMeta, type PageMeta } from './api';

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

/**
 * Une page de tickets filtrée côté serveur. `meta.total` et `meta.montantPaye` portent sur toute la
 * sélection, pas seulement sur la page : ce sont eux qu'il faut afficher comme totaux.
 */
export async function getTransactions(
  params: TransactionQuery & { page?: number; limit?: number } = {}
): Promise<{ data: TransactionItem[]; total: number; montantPaye: number; nombrePaye: number; meta?: PageMeta }> {
  const { data, meta } = await apiRequestWithMeta<TransactionItem[]>(`/transactions${transactionQuery(params)}`);
  const rows = Array.isArray(data) ? data : [];
  return { data: rows, total: meta?.total ?? rows.length, montantPaye: meta?.montantPaye ?? 0, nombrePaye: meta?.nombrePaye ?? 0, meta };
}

export type UsedCategory = { valeur: string; libelle: string; nombre: number };

/** Catégories présentes dans les tickets de l'année, une par libellé (le serveur étend le filtre à toutes ses formes). */
export async function getUsedCategories(year: number): Promise<UsedCategory[]> {
  return apiRequest<UsedCategory[]>(`/transactions/categories-utilisees?year=${year}`);
}

/** Export CSV complet de la sélection, produit par le serveur (encadrement et finances). */
export async function downloadTransactionsCsv(params: TransactionQuery & { year: number }) {
  await apiDownload(`/transactions/export${transactionQuery(params)}`, `tickets_${params.year}.csv`);
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
