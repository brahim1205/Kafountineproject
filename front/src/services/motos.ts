import { apiRequest } from './api';

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

export type MotoPayment = {
  id: string;
  motoId: string;
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

export async function listMotos(year?: number): Promise<Moto[]> {
  const query = year ? `?year=${year}&limit=300` : '?limit=300';
  const result = await apiRequest<ApiListResult<Moto>>(`/motos${query}`);
  return normalizeListResult(result);
}

export async function getMotosStats(year?: number): Promise<MotoStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<MotoStats>(`/motos/statistiques${query}`);
}

export async function getMotoConfiguration() {
  return apiRequest<{ tarifMensuel: number; penaliteRetard: number }>('/motos/configuration');
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
  const result = await apiRequest<ApiListResult<Moto>>(`/motos?limit=300`);
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

export async function listMotoPayments(year?: number): Promise<MotoPayment[]> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<MotoPayment[]>(`/motos/paiements${query}`);
}

export async function createMoto(payload: CreateMotoPayload): Promise<Moto> {
  return apiRequest<Moto>('/motos', {
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

export async function createMotoPayment(payload: { motoId: string; reference: string; mois?: string }) {
  return apiRequest<MotoPayment>('/motos/paiements', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}
