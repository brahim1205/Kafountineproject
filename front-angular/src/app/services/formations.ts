import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


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

/** Attestation de formation d'un jeune certifié. */
export interface Attestation {
  numero: string;
  nom: string;
  prenom: string;
  cni: string;
  sexe: string;
  dateNaissance: string;
  formation: string;
  domaine: string;
  duree: string;
  responsable: string;
  dateDebut: string;
  dateFin: string;
  tauxAssiduite: number;
}

@Injectable({ providedIn: 'root' })
export class FormationsApi {
  private readonly api = inject(ApiService);


  async listFormations(year?: number): Promise<Formation[]> {
  const params = new URLSearchParams();
  params.set('limit', '200');
  if (year) {
    params.set('year', String(year));
  }
  const result = await this.api.request<ApiListResult<Formation>>(`/formations?${params.toString()}`);
  return normalizeListResult(result);
}

  async createFormation(payload: CreateFormationPayload): Promise<Formation> {
  return this.api.request<Formation>('/formations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

  async updateFormation(id: string, payload: Partial<CreateFormationPayload>): Promise<Formation> {
  return this.api.request<Formation>(`/formations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deleteFormation(id: string) {
  return this.api.request<{ success?: boolean }>(`/formations/${id}`, {
    method: 'DELETE',
  });
}

  async getFormationStats(year?: number): Promise<FormationStats> {
  const query = year ? `?year=${year}` : '';
  return this.api.request<FormationStats>(`/formations/statistiques${query}`);
}

  async listJeunes(year?: number): Promise<Jeune[]> {
  const params = new URLSearchParams();
  params.set('limit', '500');
  if (year) {
    params.set('year', String(year));
  }
  const result = await this.api.request<ApiListResult<Jeune>>(`/jeunes?${params.toString()}`);
  return normalizeListResult(result);
}

  async checkJeuneCniExists(cni: string, excludeId?: string): Promise<boolean> {
  const result = await this.api.request<ApiListResult<Jeune>>(`/jeunes?search=${encodeURIComponent(cni)}&limit=50`);
  const items = normalizeListResult(result);
  const match = items.find((j) => String(j.cni) === String(cni));
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

  async checkJeuneTelephoneExists(telephone: string, excludeId?: string): Promise<boolean> {
  const result = await this.api.request<ApiListResult<Jeune>>(`/jeunes?search=${encodeURIComponent(telephone)}&limit=50`);
  const items = normalizeListResult(result);
  const match = items.find((j) => String(j.telephone) === String(telephone));
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

  async validateJeuneDuplicates(cni: string, telephone: string, excludeId?: string): Promise<{ cniExists: boolean; telephoneExists: boolean }> {
  const [cniExists, telephoneExists] = await Promise.all([
    this.checkJeuneCniExists(cni, excludeId),
    this.checkJeuneTelephoneExists(telephone, excludeId),
  ]);
  
  return { cniExists, telephoneExists };
}

  async createJeune(payload: CreateJeunePayload): Promise<Jeune> {
  return this.api.request<Jeune>('/jeunes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

  async deleteJeune(id: string) {
  return this.api.request<{ success?: boolean }>(`/jeunes/${id}`, {
    method: 'DELETE',
  });
}

  async inscrireJeuneFormation(jeuneId: string, formationId: string) {
  return this.api.request<{ success?: boolean }>(`/jeunes/${jeuneId}/formations/${formationId}`, {
    method: 'POST',
  });
}

  /** Retire le jeune de la formation (sa fiche est conservée). */
  async desinscrireJeuneFormation(jeuneId: string, formationId: string) {
  return this.api.request<{ success?: boolean }>(`/jeunes/${jeuneId}/formations/${formationId}`, { method: 'DELETE' });
}

  /** Pointe une séance pour un jeune : présent ou absent. */
  async pointerPresence(jeuneId: string, formationId: string, present: boolean) {
  return this.api.request<{ presences: number; absences: number; tauxAssiduite: number }>(`/jeunes/${jeuneId}/formations/${formationId}/presences`, {
    method: 'POST',
    body: JSON.stringify({ present }),
  });
}

  /** Clôture la session : statut final de chaque inscrit selon son assiduité. */
  async cloturerFormation(formationId: string) {
  return this.api.request<{ inscrits: number; certifies: number; seuil: number }>(`/formations/${formationId}/cloture`, { method: 'POST', body: '{}' });
}

  async getAttestation(jeuneId: string, formationId: string): Promise<Attestation> {
  return this.api.request<Attestation>(`/jeunes/${jeuneId}/formations/${formationId}/attestation`);
}
}
