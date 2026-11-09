import { apiRequest, apiRequestWithMeta, type PageMeta } from './api';

export type Moto = {
  id: string;
  matricule: string;
  marque: string;
  modele: string;
  annee: number;
  couleur?: string | null;
  proprietaireId: string;
  conducteurId?: string | null;
  permis?: string | null;
  statut?: string;
  photo?: string | null;
  proprietaire?: {
    id: string;
    nom: string;
    prenom: string;
    nin?: string;
    telephone?: string;
    cni?: string;
  };
  conducteur?: {
    id: string;
    nom: string;
    prenom: string;
    nin?: string;
    telephone?: string;
    cni?: string;
  };
  enRetard?: boolean;
  montantPenalite?: number;
  prochainPaiement?: string | null;
  dernierPaiement?: string | null;
  joursRetard?: number;
};

export type MotoStats = {
  total?: number;
  totalMotos?: number;
  enRetard?: number;
  paiementsMois?: number;
  recettesMois?: number;
  recettesAnnee?: number;
  tauxPaiement?: number;
  penalitesEnCours?: number;
  montantEnRetard?: number;
};

export type MotoPaymentType = 'ADHESION' | 'COTISATION' | 'AMENDE_POLICE';

export type MotoPayment = {
  id: string;
  motoId: string;
  type?: MotoPaymentType;
  montant: number;
  reference?: string;
  statut: string;
  datePaiement?: string | null;
  mois?: string;
  numeroRecu?: string;
  moto?: Moto | null;
  agent?: string;
};

export type CreateMotoPayload = {
  matricule: string;
  marque: string;
  modele: string;
  annee: number;
  couleur?: string;
  proprietaireId: string;
  conducteurId?: string;
  permis?: string;
  photo?: string;
  /** Année d'exercice à laquelle la moto est rattachée (par défaut : année en cours). */
  year?: number;
};

export type UpdateMotoPayload = Partial<CreateMotoPayload> & {
  statut?: string;
};

type ApiListResult<T> = T[] | { data?: T[] };

function normalizeListResult<T>(result: ApiListResult<T>): T[] {
  if (Array.isArray(result)) {
    return result;
  }

  if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}


function pageQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export async function pageMotos(params: { year?: number; page: number; limit: number; search?: string; etat?: string }): Promise<{ data: Moto[]; meta: PageMeta }> {
  return apiRequestWithMeta<Moto[]>(`/motos?${pageQuery(params)}`) as Promise<{ data: Moto[]; meta: PageMeta }>;
}

export async function pageMotoPayments(params: { year?: number; page: number; limit: number }): Promise<{ data: MotoPayment[]; meta: PageMeta }> {
  return apiRequestWithMeta<MotoPayment[]>(`/motos/paiements?${pageQuery(params)}`) as Promise<{ data: MotoPayment[]; meta: PageMeta }>;
}

export async function getMotosStats(year?: number): Promise<MotoStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<MotoStats>(`/motos/statistiques${query}`);
}

export async function getMotoConfiguration() {
  return apiRequest<{ droitAdhesion: number; tarifMensuel: number; penaliteRetard: number; amendePolice: number }>('/motos/configuration');
}

/**
 * Vérifie si un numéro de matricule existe déjà
 */
export async function checkMatriculeExists(matricule: string, excludeId?: string): Promise<boolean> {
  const result = await apiRequest<ApiListResult<Moto>>(`/motos?search=${encodeURIComponent(matricule)}&limit=50`);
  const items = normalizeListResult(result);
  const match = items.find((m) => String(m.matricule).toLowerCase() === String(matricule).toLowerCase());
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

/**
 * Vérifie si un numéro de permis existe déjà
 */
export async function checkPermisExists(permis: string, excludeId?: string): Promise<boolean> {
  if (!permis) return false;
  const result = await apiRequest<ApiListResult<Moto>>(`/motos?search=${encodeURIComponent(permis)}&limit=20`);
  const items = normalizeListResult(result);
  const match = items.find((m) => m.permis && String(m.permis).toLowerCase() === String(permis).toLowerCase());
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

/**
 * Valide les doublons avant création d'une moto
 */
export async function validateMotoDuplicates(
  matricule: string,
  permis: string | undefined,
  excludeId?: string
): Promise<{ matriculeExists: boolean; permisExists: boolean }> {
  const [matriculeExists, permisExists] = await Promise.all([
    checkMatriculeExists(matricule, excludeId),
    checkPermisExists(permis, excludeId),
  ]);
  
  return { matriculeExists, permisExists };
}

export async function createMoto(payload: CreateMotoPayload): Promise<Moto & { adhesion?: MotoPayment }> {
  return apiRequest<Moto & { adhesion?: MotoPayment }>('/motos', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function updateMoto(id: string, payload: UpdateMotoPayload): Promise<Moto> {
  return apiRequest<Moto>(`/motos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function changeMotoDriver(id: string, payload: {
  conducteurId: string;
  permis: string;
}) {
  return apiRequest<Moto>(`/motos/${id}/changement-conducteur`, {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

export async function createMotoPayment(payload: { motoId: string; type?: 'COTISATION' | 'AMENDE_POLICE'; reference?: string }) {
  return apiRequest<MotoPayment>('/motos/paiements', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}
