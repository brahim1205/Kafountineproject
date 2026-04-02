import { apiRequest } from './api';

export type PlaceMarche = {
  id: string;
  numeroPlace?: string;
  numero?: string;
  type: string;
  zone: string;
  occupantId?: string | null;
  occupant?: string | null;
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
};

export type UpdatePlaceMarchePayload = Partial<CreatePlaceMarchePayload>;

export type CreatePaiementMarchePayload = {
  placeId: string;
  periode: string;
  montant: number;
  reference: string;
};

export async function listPlacesMarche(year?: number): Promise<PlaceMarche[]> {
  const query = year ? `?year=${year}` : '';
  const result = await apiRequest<PlaceMarche[] | { data?: PlaceMarche[] }>(`/marche/places${query}`);
  return Array.isArray(result) ? result : [];
}

export async function listPaiementsMarche(year?: number): Promise<PaiementMarche[]> {
  const query = year ? `?year=${year}` : '';
  const result = await apiRequest<PaiementMarche[] | { data?: PaiementMarche[] }>(`/marche/paiements${query}`);
  return Array.isArray(result) ? result : [];
}

export async function getMarcheStats(year?: number): Promise<MarcheStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<MarcheStats>(`/marche/statistiques${query}`);
}

export async function createPlaceMarche(payload: CreatePlaceMarchePayload): Promise<PlaceMarche> {
  return apiRequest<PlaceMarche>('/marche/places', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updatePlaceMarche(id: string, payload: UpdatePlaceMarchePayload): Promise<PlaceMarche> {
  return apiRequest<PlaceMarche>(`/marche/places/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function createPaiementMarche(payload: CreatePaiementMarchePayload): Promise<PaiementMarche> {
  return apiRequest<PaiementMarche>('/marche/paiements', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}
