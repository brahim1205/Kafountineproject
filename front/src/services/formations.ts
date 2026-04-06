import { apiRequest } from './api';

export type Formation = {
  id: string;
  nom: string;
  domaine: string;
  duree: string;
  responsable: string;
  budget: number;
  dateDebut: string;
  dateFin: string;
  statut: string;
  nombreInscrits?: number;
  nombreCertifies?: number;
  tauxReussite?: number;
  year?: number;
};

export type JeuneFormationEnrollment = {
  formationId: string;
  dateInscription?: string;
  tauxAssiduite?: number;
  statutFinal?: string;
  presences?: number;
  absences?: number;
};

export type Jeune = {
  id: string;
  nom: string;
  prenom: string;
  cni: string;
  telephone: string;
  adresse: string;
  niveauEtude: string;
  sexe: string;
  dateNaiss: string;
  photo?: string | null;
  createdAt?: string;
  formations?: JeuneFormationEnrollment[];
  year?: number;
};

export type FormationStats = {
  totalFormations?: number;
  formationsEnCours?: number;
  formationsTerminees?: number;
  totalJeunes?: number;
  totalJeunesFormes?: number;
  certifies?: number;
  totalCertifies?: number;
  tauxReussiteGlobal?: number;
  budgetTotal?: number;
  repartitionDomaines?: Array<{ domaine: string; nombre: number; pourcentage?: number }>;
  repartitionSexe?: Array<{ sexe: string; nombre: number; pourcentage?: number }>;
  evolutionAnnuelle?: Array<{ annee: number; nombre: number }>;
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

export type CreateFormationPayload = {
  nom: string;
  domaine: string;
  duree: string;
  responsable: string;
  budget: number;
  dateDebut: string;
  dateFin: string;
  statut: string;
  year?: number;
};

export type CreateJeunePayload = {
  nom: string;
  prenom: string;
  cni: string;
  telephone: string;
  adresse: string;
  niveauEtude: string;
  sexe: string;
  dateNaiss: string;
  year?: number;
};

export async function listFormations(year?: number): Promise<Formation[]> {
  const params = new URLSearchParams();
  params.set('limit', '200');
  if (year) {
    params.set('year', String(year));
  }
  const result = await apiRequest<ApiListResult<Formation>>(`/formations?${params.toString()}`);
  return normalizeListResult(result);
}

export async function createFormation(payload: CreateFormationPayload): Promise<Formation> {
  return apiRequest<Formation>('/formations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFormation(id: string, payload: Partial<CreateFormationPayload>): Promise<Formation> {
  return apiRequest<Formation>(`/formations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteFormation(id: string) {
  return apiRequest<{ success?: boolean }>(`/formations/${id}`, {
    method: 'DELETE',
  });
}

export async function getFormationStats(year?: number): Promise<FormationStats> {
  const query = year ? `?year=${year}` : '';
  return apiRequest<FormationStats>(`/formations/statistiques${query}`);
}

export async function listJeunes(year?: number): Promise<Jeune[]> {
  const params = new URLSearchParams();
  params.set('limit', '500');
  if (year) {
    params.set('year', String(year));
  }
  const result = await apiRequest<ApiListResult<Jeune>>(`/jeunes?${params.toString()}`);
  return normalizeListResult(result);
}

/**
 * Vérifie si un CNI existe déjà chez les jeunes
 */
export async function checkJeuneCniExists(cni: string, excludeId?: string): Promise<boolean> {
  const result = await apiRequest<ApiListResult<Jeune>>(`/jeunes?search=${encodeURIComponent(cni)}&limit=50`);
  const items = normalizeListResult(result);
  const match = items.find((j) => String(j.cni) === String(cni));
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

/**
 * Vérifie si un téléphone existe déjà chez les jeunes
 */
export async function checkJeuneTelephoneExists(telephone: string, excludeId?: string): Promise<boolean> {
  const result = await apiRequest<ApiListResult<Jeune>>(`/jeunes?search=${encodeURIComponent(telephone)}&limit=50`);
  const items = normalizeListResult(result);
  const match = items.find((j) => String(j.telephone) === String(telephone));
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

/**
 * Valide les doublons avant création d'un jeune
 */
export async function validateJeuneDuplicates(
  cni: string,
  telephone: string,
  excludeId?: string
): Promise<{ cniExists: boolean; telephoneExists: boolean }> {
  const [cniExists, telephoneExists] = await Promise.all([
    checkJeuneCniExists(cni, excludeId),
    checkJeuneTelephoneExists(telephone, excludeId),
  ]);
  
  return { cniExists, telephoneExists };
}

export async function createJeune(payload: CreateJeunePayload): Promise<Jeune> {
  return apiRequest<Jeune>('/jeunes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteJeune(id: string) {
  return apiRequest<{ success?: boolean }>(`/jeunes/${id}`, {
    method: 'DELETE',
  });
}

export async function inscrireJeuneFormation(jeuneId: string, formationId: string) {
  return apiRequest<{ success?: boolean }>(`/jeunes/${jeuneId}/formations/${formationId}`, {
    method: 'POST',
  });
}
