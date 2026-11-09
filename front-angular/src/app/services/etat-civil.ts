import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';
import { PageMeta } from '../core/api/api.models';
import { Contribuable } from './contribuables';

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

export type EtatCivilDocumentType = { id: string; nom: string; tarif: number; unite: string };

@Injectable({ providedIn: 'root' })
export class EtatCivilApi {
  private readonly api = inject(ApiService);


  async pageEtatCivil(params: { year?: number; page: number; limit: number; search?: string; type?: string; statut?: string }): Promise<{ data: EtatCivilDemande[]; meta: PageMeta }> {
  return this.api.requestWithMeta<EtatCivilDemande[]>(`/etat-civil?${pageQuery(params)}`) as Promise<{ data: EtatCivilDemande[]; meta: PageMeta }>;
}

  async getEtatCivilStats(year?: number): Promise<EtatCivilStats> {
  const query = year ? `?year=${year}` : '';
  return this.api.request<EtatCivilStats>(`/etat-civil/statistiques${query}`);
}

  async createEtatCivilDemande(payload: {
  contribuableId: string;
  typeDocument: string;
  exemplaires: number;
  montant: number;
  observations?: string;
  year?: number;
}): Promise<EtatCivilDemande> {
  return this.api.request<EtatCivilDemande>('/etat-civil', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async updateEtatCivilDemande(id: string, payload: {
  contribuableId?: string;
  typeDocument?: string;
  exemplaires?: number;
  montant?: number;
  statut?: string;
  observations?: string;
}): Promise<EtatCivilDemande> {
  return this.api.request<EtatCivilDemande>(`/etat-civil/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deleteEtatCivilDemande(id: string): Promise<void> {
  return this.api.request<void>(`/etat-civil/${id}`, {
    method: 'DELETE',
  });
}

  async getEtatCivilDocumentTypes(): Promise<EtatCivilDocumentType[]> {
  return this.api.request<EtatCivilDocumentType[]>('/etat-civil/types-documents');
}
}
