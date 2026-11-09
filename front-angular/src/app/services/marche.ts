import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';
import { PageMeta } from '../core/api/api.models';

export type PlaceMarche = {
  id: string;
  numeroPlace?: string;
  numero?: string;
  type: string;
  zone: string;
  occupantId?: string | null;
  occupant?: string | null;
  telephone?: string | null;
  dateAttribution?: string | null;
  activite?: string | null;
  tarif: number;
  periode: string;
  statut: string;
};

export type PaiementMarche = {
  id: string;
  placeId: string;
  montant: number;
  reference?: string;
  periode: string;
  statut: string;
  datePaiement?: string | null;
  place?: PlaceMarche | null;
};

export type MarcheStats = {
  placesTotales?: number;
  placesOccupees?: number;
  placesDisponibles?: number;
  recettesMois?: number;
  tauxOccupation?: number;
};

export type CreatePlaceMarchePayload = {
  numeroPlace: string;
  type: string;
  zone: string;
  occupantId?: string;
  activite?: string;
  tarif: number;
  periode: string;
  statut?: string;
  year?: number;
};

export type UpdatePlaceMarchePayload = Partial<Omit<CreatePlaceMarchePayload, 'occupantId'>> & {
  /** null libère la place. */
  occupantId?: string | null;
};

export type CreatePaiementMarchePayload = {
  placeId: string;
  periode: string;
  montant: number;
  reference: string;
};

function pageQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export type MarcheDetails = {
  topCommercants: Array<{ nom: string; activite: string; place: string; paiements: number; montant: number }>;
  evolutionMensuelle: Array<{ mois: string; places: number; montant: number }>;
};

@Injectable({ providedIn: 'root' })
export class MarcheApi {
  private readonly api = inject(ApiService);


  async listPlacesMarche(year?: number): Promise<PlaceMarche[]> {
  const query = year ? `?year=${year}` : '';
  const result = await this.api.request<PlaceMarche[] | { data?: PlaceMarche[] }>(`/marche/places${query}`);
  return Array.isArray(result) ? result : [];
}

  async pagePaiementsMarche(params: { year?: number; page: number; limit: number; search?: string; statut?: string }): Promise<{ data: PaiementMarche[]; meta: PageMeta }> {
  return this.api.requestWithMeta<PaiementMarche[]>(`/marche/paiements?${pageQuery(params)}`) as Promise<{ data: PaiementMarche[]; meta: PageMeta }>;
}

  async getMarcheDetails(year?: number): Promise<MarcheDetails> {
  return this.api.request<MarcheDetails>(`/marche/statistiques/details${year ? `?year=${year}` : ''}`);
}

  async getMarcheStats(year?: number): Promise<MarcheStats> {
  const query = year ? `?year=${year}` : '';
  return this.api.request<MarcheStats>(`/marche/statistiques${query}`);
}

  async createPlaceMarche(payload: CreatePlaceMarchePayload): Promise<PlaceMarche> {
  return this.api.request<PlaceMarche>('/marche/places', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async updatePlaceMarche(id: string, payload: UpdatePlaceMarchePayload): Promise<PlaceMarche> {
  return this.api.request<PlaceMarche>(`/marche/places/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async createPaiementMarche(payload: CreatePaiementMarchePayload): Promise<PaiementMarche> {
  return this.api.request<PaiementMarche>('/marche/paiements', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}
}
