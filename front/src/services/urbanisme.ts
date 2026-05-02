import { apiRequest } from './api';

export interface DossierUrbanisme {
  id: string;
  numero: string;
  contribuableId: string;
  type: string;
  description?: string;
  surface?: number;
  localisation?: string;
  nature?: string;
  montant: number;
  agent: string;
  statut: string;
  date?: string;
  createdAt: string;
  updatedAt: string;
  contribuable?: {
    id: string;
    nom: string;
    prenom: string;
    nin: string;
    telephone: string;
    adresse: string;
  };
}

type DossiersUrbanismeApiResult =
  | DossierUrbanisme[]
  | { data?: DossierUrbanisme[]; meta?: { page: number; limit: number; total: number } };

export interface UrbanismeStats {
  total: number;
  enAttente: number;
  valide: number;
  rejete: number;
  montantTotal: number;
  totalDossiers?: number;
  dossiersEnAttente?: number;
  dossiersValides?: number;
  dossiersRejetes?: number;
  recettes?: number;
}

export async function getDossiersUrbanisme(params?: {
  page?: number;
  limit?: number;
  statut?: string;
  type?: string;
  year?: number;
}): Promise<{ data: DossierUrbanisme[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.statut) query.set('statut', params.statut);
  if (params?.type) query.set('type', params.type);
  if (params?.year) query.set('year', String(params.year));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  const result = await apiRequest<DossiersUrbanismeApiResult>(`/urbanisme${suffix}`);

  // apiRequest unwraps { success, data, meta } → returns data
  // If result is an array, wrap it
  if (Array.isArray(result)) {
    return { data: result, meta: { page: 1, limit: result.length, total: result.length } };
  }
  // If result has data property (was already wrapped)
  if (result?.data) {
    return { data: result.data, meta: result.meta || { page: 1, limit: 20, total: result.data.length } };
  }
  return { data: [], meta: { page: 1, limit: 20, total: 0 } };
}

export async function getDossierById(id: string): Promise<DossierUrbanisme> {
  return apiRequest<DossierUrbanisme>(`/urbanisme/${id}`);
}

export async function createDossierUrbanisme(data: {
  contribuableId: string;
  type: string;
  description?: string;
  surface?: number;
  localisation?: string;
  nature?: string;
  montant?: number;
  numero?: string;
  statut?: string;
}): Promise<DossierUrbanisme> {
  return apiRequest<DossierUrbanisme>('/urbanisme', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDossierUrbanisme(
  id: string,
  data: Partial<DossierUrbanisme>
): Promise<DossierUrbanisme> {
  return apiRequest<DossierUrbanisme>(`/urbanisme/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDossierUrbanisme(id: string): Promise<void> {
  await apiRequest(`/urbanisme/${id}`, {
    method: 'DELETE',
  });
}

export async function getUrbanismeStats(year?: number): Promise<UrbanismeStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<UrbanismeStats>(`/urbanisme/statistiques${query}`);
}
