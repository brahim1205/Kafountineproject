import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


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

@Injectable({ providedIn: 'root' })
export class UrbanismeApi {
  private readonly api = inject(ApiService);


  async getDossiersUrbanisme(params?: {
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

  const result = await this.api.request<DossiersUrbanismeApiResult>(`/urbanisme${suffix}`);

  // this.api.request unwraps { success, data, meta } → returns data
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

  async getDossierById(id: string): Promise<DossierUrbanisme> {
  return this.api.request<DossierUrbanisme>(`/urbanisme/${id}`);
}

  async createDossierUrbanisme(data: {
  contribuableId: string;
  type: string;
  description?: string;
  surface?: number;
  localisation?: string;
  nature?: string;
  montant?: number;
  statut?: string;
}): Promise<DossierUrbanisme> {
  return this.api.request<DossierUrbanisme>('/urbanisme', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

  async updateDossierUrbanisme(id: string, data: Partial<DossierUrbanisme>): Promise<DossierUrbanisme> {
  return this.api.request<DossierUrbanisme>(`/urbanisme/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

  async deleteDossierUrbanisme(id: string): Promise<void> {
  await this.api.request(`/urbanisme/${id}`, {
    method: 'DELETE',
  });
}

  async getUrbanismeStats(year?: number): Promise<UrbanismeStats> {
  const query = year ? `?year=${year}` : '';
  return this.api.request<UrbanismeStats>(`/urbanisme/statistiques${query}`);
}
}
