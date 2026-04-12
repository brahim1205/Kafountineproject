import { apiRequest } from './api';
import type { Contribuable } from './contribuables';

export type EtatCivilDemande = {
  id: string;
  numero: string;
  typeDocument: string;
  exemplaires?: number;
  montant: number;
  date?: string;
  statut?: string;
  observations?: string;
  agent?: string;
  contribuable?: Contribuable;
};

export type EtatCivilStats = {
  totalDemandes?: number;
  recettes?: number;
  enAttente?: number;
  validees?: number;
};

export async function listEtatCivilDemandes(year?: number): Promise<EtatCivilDemande[]> {
  const query = new URLSearchParams();
  query.set('limit', '300');
  if (year) query.set('year', String(year));
  const result = await apiRequest<EtatCivilDemande[] | { data?: EtatCivilDemande[] }>(`/etat-civil?${query.toString()}`);
  if (Array.isArray(result)) {
    return result;
  }

  if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function getEtatCivilStats(year?: number): Promise<EtatCivilStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<EtatCivilStats>(`/etat-civil/statistiques${query}`);
}

export async function createEtatCivilDemande(payload: {
  contribuableId: string;
  typeDocument: string;
  exemplaires: number;
  montant: number;
  observations?: string;
  year?: number;
}): Promise<EtatCivilDemande> {
  return apiRequest<EtatCivilDemande>('/etat-civil', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updateEtatCivilDemande(id: string, payload: {
  statut?: string;
  observations?: string;
}): Promise<EtatCivilDemande> {
  return apiRequest<EtatCivilDemande>(`/etat-civil/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
