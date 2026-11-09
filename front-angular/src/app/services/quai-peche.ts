import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';
import { PageMeta } from '../core/api/api.models';

export interface Pecheur {
  id: string;
  nom: string;
  prenom: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
  embarcations?: Embarcation[];
  _count?: { commissions: number };
}

export interface Embarcation {
  id: string;
  nom: string;
  immatriculation: string;
  type: string;
  taille?: number;
  moteur?: string;
  statut: string;
  pecheurId?: string;
  pecheur?: Pecheur;
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  id: string;
  numero: string;
  poids: number;
  typePoisson: string;
  temperatura?: number;
  observations?: string;
  statut: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  pecheurId: string;
  pecheur?: Pecheur;
}

export interface QuaiPecheStats {
  totalCommissions: number;
  totalPoids: number;
  commissionsEnAttente: number;
  totalPecheurs: number;
  totalEmbarcations: number;
}

export interface CamionFrigorifique {
  id: string;
  immatriculation: string;
  marque: string;
  modele?: string;
  capacite?: number;
  chauffeur?: string;
  telephone?: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
  _count?: { expeditions: number };
}

export interface Expedition {
  id: string;
  numero: string;
  date: string;
  poids: number;
  destination?: string;
  montant?: number;
  statut: string;
  observations?: string;
  camionId: string;
  camion?: CamionFrigorifique;
  createdAt: string;
  updatedAt: string;
}

export type QuaiListParams = { year?: number; limit?: number };

function quaiListQuery(params?: QuaiListParams) {
  const query = new URLSearchParams();
  if (params?.year) query.set('year', String(params.year));
  if (params?.limit) query.set('limit', String(params.limit));
  return query.toString() ? `?${query.toString()}` : '';
}

export type QuaiPageParams = { year?: number; page: number; limit: number; search?: string; statut?: string };

@Injectable({ providedIn: 'root' })
export class QuaiPecheApi {
  private readonly api = inject(ApiService);


  private quaiPage<T>(collection: string, params: QuaiPageParams): Promise<{ data: T[]; meta: PageMeta }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return this.api.requestWithMeta<T[]>(`/quai-peche/${collection}?${query.toString()}`) as Promise<{ data: T[]; meta: PageMeta }>;
}

  pagePecheurs = (params: QuaiPageParams) => this.quaiPage<Pecheur>('pecheurs', params);

  pageEmbarcations = (params: QuaiPageParams) => this.quaiPage<Embarcation>('embarcations', params);

  pageCommissions = (params: QuaiPageParams) => this.quaiPage<Commission>('commissions', params);

  pageCamions = (params: QuaiPageParams) => this.quaiPage<CamionFrigorifique>('camions', params);

  pageExpeditions = (params: QuaiPageParams) => this.quaiPage<Expedition>('expeditions', params);

  async listPecheurs(params?: QuaiListParams): Promise<Pecheur[]> {
  const result = await this.api.request<Pecheur[]>(`/quai-peche/pecheurs${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

  async getPecheur(id: string): Promise<Pecheur> {
  return this.api.request<Pecheur>(`/quai-peche/pecheurs/${id}`);
}

  async createPecheur(payload: {
  nom: string;
  prenom: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
}): Promise<Pecheur> {
  return this.api.request<Pecheur>('/quai-peche/pecheurs', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async updatePecheur(id: string, payload: {
  nom?: string;
  prenom?: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
  statut?: string;
}): Promise<Pecheur> {
  return this.api.request<Pecheur>(`/quai-peche/pecheurs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deletePecheur(id: string): Promise<void> {
  await this.api.request(`/quai-peche/pecheurs/${id}`, {
    method: 'DELETE',
  });
}

  async listEmbarcations(params?: QuaiListParams): Promise<Embarcation[]> {
  const result = await this.api.request<Embarcation[]>(`/quai-peche/embarcations${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

  async getEmbarcation(id: string): Promise<Embarcation> {
  return this.api.request<Embarcation>(`/quai-peche/embarcations/${id}`);
}

  async createEmbarcation(payload: {
  nom: string;
  immatriculation: string;
  type: string;
  taille?: number;
  moteur?: string;
  pecheurId?: string;
}): Promise<Embarcation> {
  return this.api.request<Embarcation>('/quai-peche/embarcations', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async updateEmbarcation(id: string, payload: {
  nom?: string;
  immatriculation?: string;
  type?: string;
  taille?: number;
  moteur?: string;
  pecheurId?: string;
  statut?: string;
}): Promise<Embarcation> {
  return this.api.request<Embarcation>(`/quai-peche/embarcations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deleteEmbarcation(id: string): Promise<void> {
  await this.api.request(`/quai-peche/embarcations/${id}`, {
    method: 'DELETE',
  });
}

  async listCommissions(params?: QuaiListParams): Promise<Commission[]> {
  const result = await this.api.request<Commission[]>(`/quai-peche/commissions${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

  async getCommission(id: string): Promise<Commission> {
  return this.api.request<Commission>(`/quai-peche/commissions/${id}`);
}

  async createCommission(payload: {
  pecheurId: string;
  poids: number;
  typePoisson: string;
  temperatura?: number;
  observations?: string;
}): Promise<Commission> {
  return this.api.request<Commission>('/quai-peche/commissions', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async updateCommission(id: string, payload: {
  poids?: number;
  typePoisson?: string;
  temperatura?: number;
  observations?: string;
  statut?: string;
}): Promise<Commission> {
  return this.api.request<Commission>(`/quai-peche/commissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async validateCommission(id: string): Promise<Commission> {
  return this.updateCommission(id, { statut: 'VALIDEE' });
}

  async deleteCommission(id: string): Promise<void> {
  await this.api.request(`/quai-peche/commissions/${id}`, {
    method: 'DELETE',
  });
}

  async getQuaiPecheStats(year?: number): Promise<QuaiPecheStats> {
  const query = year ? `?year=${year}` : '';
  return this.api.request<QuaiPecheStats>(`/quai-peche/statistiques${query}`);
}

  async listCamions(params?: QuaiListParams): Promise<CamionFrigorifique[]> {
  const result = await this.api.request<CamionFrigorifique[]>(`/quai-peche/camions${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

  async getCamion(id: string): Promise<CamionFrigorifique> {
  return this.api.request<CamionFrigorifique>(`/quai-peche/camions/${id}`);
}

  async createCamion(payload: {
  immatriculation: string;
  marque: string;
  modele?: string;
  capacite?: number;
  chauffeur?: string;
  telephone?: string;
}): Promise<CamionFrigorifique> {
  return this.api.request<CamionFrigorifique>('/quai-peche/camions', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async updateCamion(id: string, payload: {
  immatriculation?: string;
  marque?: string;
  modele?: string;
  capacite?: number;
  chauffeur?: string;
  telephone?: string;
  statut?: string;
}): Promise<CamionFrigorifique> {
  return this.api.request<CamionFrigorifique>(`/quai-peche/camions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deleteCamion(id: string): Promise<void> {
  await this.api.request(`/quai-peche/camions/${id}`, {
    method: 'DELETE',
  });
}

  async listExpeditions(params?: QuaiListParams): Promise<Expedition[]> {
  const result = await this.api.request<Expedition[]>(`/quai-peche/expeditions${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

  async getExpedition(id: string): Promise<Expedition> {
  return this.api.request<Expedition>(`/quai-peche/expeditions/${id}`);
}

  async createExpedition(payload: {
  camionId: string;
  poids: number;
  destination?: string;
  montant?: number;
  observations?: string;
}): Promise<Expedition> {
  return this.api.request<Expedition>('/quai-peche/expeditions', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async updateExpedition(id: string, payload: {
  poids?: number;
  destination?: string;
  montant?: number;
  observations?: string;
  statut?: string;
}): Promise<Expedition> {
  return this.api.request<Expedition>(`/quai-peche/expeditions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deleteExpedition(id: string): Promise<void> {
  await this.api.request(`/quai-peche/expeditions/${id}`, {
    method: 'DELETE',
  });
}
}
