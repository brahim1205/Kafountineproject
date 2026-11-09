import { apiRequest , apiRequestWithMeta, type PageMeta } from './api';

// ============================================
// Types - Quai de Pêche
// ============================================

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

// ============================================
// Camions Frigorifiques
// ============================================

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

// ============================================
// Pêcheurs
// ============================================

/** Paramètres de liste acceptés par l'API du quai de pêche. */
export type QuaiListParams = { year?: number; limit?: number };

function quaiListQuery(params?: QuaiListParams) {
  const query = new URLSearchParams();
  if (params?.year) query.set('year', String(params.year));
  if (params?.limit) query.set('limit', String(params.limit));
  return query.toString() ? `?${query.toString()}` : '';
}

export type QuaiPageParams = { year?: number; page: number; limit: number; search?: string; statut?: string };

function quaiPage<T>(collection: string, params: QuaiPageParams): Promise<{ data: T[]; meta: PageMeta }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return apiRequestWithMeta<T[]>(`/quai-peche/${collection}?${query.toString()}`) as Promise<{ data: T[]; meta: PageMeta }>;
}

export const pagePecheurs = (params: QuaiPageParams) => quaiPage<Pecheur>('pecheurs', params);
export const pageEmbarcations = (params: QuaiPageParams) => quaiPage<Embarcation>('embarcations', params);
export const pageCommissions = (params: QuaiPageParams) => quaiPage<Commission>('commissions', params);
export const pageCamions = (params: QuaiPageParams) => quaiPage<CamionFrigorifique>('camions', params);
export const pageExpeditions = (params: QuaiPageParams) => quaiPage<Expedition>('expeditions', params);

export async function listPecheurs(params?: QuaiListParams): Promise<Pecheur[]> {
  const result = await apiRequest<Pecheur[]>(`/quai-peche/pecheurs${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

export async function getPecheur(id: string): Promise<Pecheur> {
  return apiRequest<Pecheur>(`/quai-peche/pecheurs/${id}`);
}

export async function createPecheur(payload: {
  nom: string;
  prenom: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
}): Promise<Pecheur> {
  return apiRequest<Pecheur>('/quai-peche/pecheurs', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updatePecheur(id: string, payload: {
  nom?: string;
  prenom?: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
  statut?: string;
}): Promise<Pecheur> {
  return apiRequest<Pecheur>(`/quai-peche/pecheurs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePecheur(id: string): Promise<void> {
  await apiRequest(`/quai-peche/pecheurs/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Embarcations
// ============================================

export async function listEmbarcations(params?: QuaiListParams): Promise<Embarcation[]> {
  const result = await apiRequest<Embarcation[]>(`/quai-peche/embarcations${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

export async function getEmbarcation(id: string): Promise<Embarcation> {
  return apiRequest<Embarcation>(`/quai-peche/embarcations/${id}`);
}

export async function createEmbarcation(payload: {
  nom: string;
  immatriculation: string;
  type: string;
  taille?: number;
  moteur?: string;
  pecheurId?: string;
}): Promise<Embarcation> {
  return apiRequest<Embarcation>('/quai-peche/embarcations', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updateEmbarcation(id: string, payload: {
  nom?: string;
  immatriculation?: string;
  type?: string;
  taille?: number;
  moteur?: string;
  pecheurId?: string;
  statut?: string;
}): Promise<Embarcation> {
  return apiRequest<Embarcation>(`/quai-peche/embarcations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEmbarcation(id: string): Promise<void> {
  await apiRequest(`/quai-peche/embarcations/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Commissions Frigorifiques
// ============================================

export async function listCommissions(params?: QuaiListParams): Promise<Commission[]> {
  const result = await apiRequest<Commission[]>(`/quai-peche/commissions${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

export async function getCommission(id: string): Promise<Commission> {
  return apiRequest<Commission>(`/quai-peche/commissions/${id}`);
}

export async function createCommission(payload: {
  pecheurId: string;
  poids: number;
  typePoisson: string;
  temperatura?: number;
  observations?: string;
}): Promise<Commission> {
  return apiRequest<Commission>('/quai-peche/commissions', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updateCommission(id: string, payload: {
  poids?: number;
  typePoisson?: string;
  temperatura?: number;
  observations?: string;
  statut?: string;
}): Promise<Commission> {
  return apiRequest<Commission>(`/quai-peche/commissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function validateCommission(id: string): Promise<Commission> {
  return updateCommission(id, { statut: 'VALIDEE' });
}

export async function deleteCommission(id: string): Promise<void> {
  await apiRequest(`/quai-peche/commissions/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Statistiques
// ============================================

export async function getQuaiPecheStats(year?: number): Promise<QuaiPecheStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<QuaiPecheStats>(`/quai-peche/statistiques${query}`);
}

// ============================================
// Camions Frigorifiques
// ============================================

export async function listCamions(params?: QuaiListParams): Promise<CamionFrigorifique[]> {
  const result = await apiRequest<CamionFrigorifique[]>(`/quai-peche/camions${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

export async function getCamion(id: string): Promise<CamionFrigorifique> {
  return apiRequest<CamionFrigorifique>(`/quai-peche/camions/${id}`);
}

export async function createCamion(payload: {
  immatriculation: string;
  marque: string;
  modele?: string;
  capacite?: number;
  chauffeur?: string;
  telephone?: string;
}): Promise<CamionFrigorifique> {
  return apiRequest<CamionFrigorifique>('/quai-peche/camions', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updateCamion(id: string, payload: {
  immatriculation?: string;
  marque?: string;
  modele?: string;
  capacite?: number;
  chauffeur?: string;
  telephone?: string;
  statut?: string;
}): Promise<CamionFrigorifique> {
  return apiRequest<CamionFrigorifique>(`/quai-peche/camions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCamion(id: string): Promise<void> {
  await apiRequest(`/quai-peche/camions/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Expeditions (Transports)
// ============================================

export async function listExpeditions(params?: QuaiListParams): Promise<Expedition[]> {
  const result = await apiRequest<Expedition[]>(`/quai-peche/expeditions${quaiListQuery(params)}`);
  return Array.isArray(result) ? result : [];
}

export async function getExpedition(id: string): Promise<Expedition> {
  return apiRequest<Expedition>(`/quai-peche/expeditions/${id}`);
}

export async function createExpedition(payload: {
  camionId: string;
  poids: number;
  destination?: string;
  montant?: number;
  observations?: string;
}): Promise<Expedition> {
  return apiRequest<Expedition>('/quai-peche/expeditions', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updateExpedition(id: string, payload: {
  poids?: number;
  destination?: string;
  montant?: number;
  observations?: string;
  statut?: string;
}): Promise<Expedition> {
  return apiRequest<Expedition>(`/quai-peche/expeditions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteExpedition(id: string): Promise<void> {
  await apiRequest(`/quai-peche/expeditions/${id}`, {
    method: 'DELETE',
  });
}
