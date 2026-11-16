import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';
import { PageMeta } from '../core/api/api.models';

/** Un changement de propriétaire ou de conducteur, tel qu'il a été déclaré. */
export type ChangementMoto = {
  id: string;
  role: 'PROPRIETAIRE' | 'CONDUCTEUR';
  ancien: string | null;
  nouveau: string | null;
  motif: string | null;
  par: string | null;
  date: string;
};

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
  /** Cotisations échues non payées et somme due (tarif + pénalité par mois). */
  moisDus?: number;
  montantDu?: number;
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
  modePaiement?: string;
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

@Injectable({ providedIn: 'root' })
export class MotosApi {
  private readonly api = inject(ApiService);


  async pageMotos(params: { year?: number; page: number; limit: number; search?: string; etat?: string }): Promise<{ data: Moto[]; meta: PageMeta }> {
  return this.api.requestWithMeta<Moto[]>(`/motos?${pageQuery(params)}`) as Promise<{ data: Moto[]; meta: PageMeta }>;
}

  async pageMotoPayments(params: { year?: number; page: number; limit: number }): Promise<{ data: MotoPayment[]; meta: PageMeta }> {
  return this.api.requestWithMeta<MotoPayment[]>(`/motos/paiements?${pageQuery(params)}`) as Promise<{ data: MotoPayment[]; meta: PageMeta }>;
}

  async getMotosStats(year?: number): Promise<MotoStats> {
  const query = year ? `?year=${year}` : '';
  return this.api.request<MotoStats>(`/motos/statistiques${query}`);
}

  async getMotoConfiguration() {
  return this.api.request<{ droitAdhesion: number; tarifMensuel: number; penaliteRetard: number; amendePolice: number }>('/motos/configuration');
}

  async checkMatriculeExists(matricule: string, excludeId?: string): Promise<boolean> {
  const result = await this.api.request<ApiListResult<Moto>>(`/motos?search=${encodeURIComponent(matricule)}&limit=50`);
  const items = normalizeListResult(result);
  const match = items.find((m) => String(m.matricule).toLowerCase() === String(matricule).toLowerCase());
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

  async checkPermisExists(permis: string, excludeId?: string): Promise<boolean> {
  if (!permis) return false;
  const result = await this.api.request<ApiListResult<Moto>>(`/motos?search=${encodeURIComponent(permis)}&limit=20`);
  const items = normalizeListResult(result);
  const match = items.find((m) => m.permis && String(m.permis).toLowerCase() === String(permis).toLowerCase());
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

  async validateMotoDuplicates(matricule: string, permis: string | undefined, excludeId?: string): Promise<{ matriculeExists: boolean; permisExists: boolean }> {
  const [matriculeExists, permisExists] = await Promise.all([
    this.checkMatriculeExists(matricule, excludeId),
    this.checkPermisExists(permis ?? '', excludeId),
  ]);
  
  return { matriculeExists, permisExists };
}

  async createMoto(payload: CreateMotoPayload): Promise<Moto & { adhesion?: MotoPayment }> {
  return this.api.request<Moto & { adhesion?: MotoPayment }>('/motos', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async declarerChangement(id: string, payload: { type: 'proprietaire' | 'conducteur'; personneId: string; permis?: string; motif: string }): Promise<Moto> {
  return this.api.request<Moto>(`/motos/${id}/changements`, { method: 'POST', body: JSON.stringify(payload) });
}

  async getHistorique(id: string): Promise<ChangementMoto[]> {
  return this.api.request<ChangementMoto[]>(`/motos/${id}/historique`);
}

  async updateMoto(id: string, payload: UpdateMotoPayload): Promise<Moto> {
  return this.api.request<Moto>(`/motos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async changeMotoDriver(id: string, payload: {
  conducteurId: string;
  permis: string;
}) {
  return this.api.request<Moto>(`/motos/${id}/changement-conducteur`, {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}

  async annulerMotoPayment(id: string, motif: string): Promise<unknown> {
  return this.api.request(`/motos/paiements/${id}/annuler`, { method: 'POST', body: JSON.stringify({ motif }) });
}

  async createMotoPayment(payload: { motoId: string; type?: 'COTISATION' | 'AMENDE_POLICE'; reference?: string; modePaiement?: string }) {
  return this.api.request<MotoPayment>('/motos/paiements', {
    method: 'POST',
    headers: {
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}
}
