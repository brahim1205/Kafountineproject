import { apiRequest, apiRequestWithMeta, type PageMeta } from './api';
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

function pageQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export async function pageEtatCivil(params: { year?: number; page: number; limit: number; search?: string; type?: string; statut?: string }): Promise<{ data: EtatCivilDemande[]; meta: PageMeta }> {
  return apiRequestWithMeta<EtatCivilDemande[]>(`/etat-civil?${pageQuery(params)}`) as Promise<{ data: EtatCivilDemande[]; meta: PageMeta }>;
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
  contribuableId?: string;
  typeDocument?: string;
  exemplaires?: number;
  montant?: number;
  statut?: string;
  observations?: string;
}): Promise<EtatCivilDemande> {
  return apiRequest<EtatCivilDemande>(`/etat-civil/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEtatCivilDemande(id: string): Promise<void> {
  return apiRequest<void>(`/etat-civil/${id}`, {
    method: 'DELETE',
  });
}

export type EtatCivilDocumentType = { id: string; nom: string; tarif: number; unite: string };

/** Types de documents (libellés lisibles, tarifs du catalogue modifiables dans Paramètres). */
export async function getEtatCivilDocumentTypes(): Promise<EtatCivilDocumentType[]> {
  return apiRequest<EtatCivilDocumentType[]>('/etat-civil/types-documents');
}
