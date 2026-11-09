import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


const MAX_CONTRIBUABLES_LIMIT = 100;

function clampContribuablesLimit(limit?: number): number | undefined {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return undefined;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_CONTRIBUABLES_LIMIT);
}

export type Contribuable = {
  id: string;
  nin: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  adresse: string;
  zone?: string;
  profession?: string;
  typeContribuable?: string;
  isActive?: boolean;
};

type ContribuablesApiResult = Contribuable[] | { data?: Contribuable[] };

type TelephoneCheckResponse = {
  exists: boolean;
  contribuable?: Contribuable | null;
};

function normalizeContribuablesResult(result: ContribuablesApiResult): Contribuable[] {
  if (Array.isArray(result)) {
    return result;
  }

  if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

@Injectable({ providedIn: 'root' })
export class ContribuablesApi {
  private readonly api = inject(ApiService);


  async listContribuables(params: { page?: number; limit?: number; search?: string; year?: number } = {}): Promise<Contribuable[]> {
  const query = new URLSearchParams();
  const limit = clampContribuablesLimit(params.limit);
  if (params.page) query.set('page', String(params.page));
  if (limit) query.set('limit', String(limit));
  if (params.search) query.set('search', String(params.search));
  if (params.year) query.set('year', String(params.year));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const result = await this.api.request<ContribuablesApiResult>(`/contribuables${suffix}`);
  return normalizeContribuablesResult(result);
}

  async searchContribuablesPage(params: {
  page: number;
  limit: number;
  search?: string;
  statut?: 'actif' | 'inactif';
}): Promise<{ items: Contribuable[]; total: number }> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(clampContribuablesLimit(params.limit) || 20) });
  if (params.search) query.set('search', params.search);
  if (params.statut) query.set('statut', params.statut);
  const { data, meta } = await this.api.requestWithMeta<ContribuablesApiResult>(`/contribuables?${query.toString()}`);
  const items = normalizeContribuablesResult(data);
  return { items, total: meta?.total ?? items.length };
}

  async findContribuableByNin(nin: string): Promise<Contribuable | null> {
  const result = await this.api.request<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(nin)}&limit=20`);
  const items = normalizeContribuablesResult(result);
  const match = items.find((c) => String(c.nin) === String(nin));
  return match || null;
}

  async checkNinExists(nin: string, excludeId?: string): Promise<boolean> {
  const result = await this.api.request<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(nin)}&limit=50`);
  const items = normalizeContribuablesResult(result);
  const match = items.find((c) => String(c.nin) === String(nin));
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

  async checkTelephoneExists(telephone: string, excludeId?: string): Promise<boolean> {
  // Use the new efficient endpoint
  try {
    const result = await this.api.request<TelephoneCheckResponse>(`/contribuables/check-telephone?telephone=${encodeURIComponent(telephone)}`);
    if (!result || !result.exists) return false;
    if (excludeId && result.contribuable?.id === excludeId) return false;
    return true;
  } catch {
    const result = await this.api.request<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(telephone)}&limit=50`);
    const items = normalizeContribuablesResult(result);
    const match = items.find((c) => String(c.telephone) === String(telephone));
    if (!match) return false;
    if (excludeId && match.id === excludeId) return false;
    return true;
  }
}

  async validateContribuableDuplicates(nin: string, telephone: string, excludeId?: string): Promise<{ ninExists: boolean; telephoneExists: boolean }> {
  const [ninExists, telephoneExists] = await Promise.all([
    this.checkNinExists(nin, excludeId),
    this.checkTelephoneExists(telephone, excludeId),
  ]);
  
  return { ninExists, telephoneExists };
}

  async createContribuable(payload: {
  nin: string;
  nom: string;
  prenom: string;
  telephone: string;
  adresse?: string;
  profession?: string;
  zone?: string;
  typeContribuable?: string;
  email?: string;
  dateNaiss?: string;
  lieuNaiss?: string;
}): Promise<Contribuable> {
  return this.api.request<Contribuable>('/contribuables', {
    method: 'POST',
    body: JSON.stringify({
      nin: payload.nin,
      nom: payload.nom,
      prenom: payload.prenom,
      dateNaiss: payload.dateNaiss || '2000-01-01',
      lieuNaiss: payload.lieuNaiss || 'Non précisé',
      adresse: payload.adresse || 'Non précisée',
      telephone: payload.telephone,
      profession: payload.profession,
      zone: payload.zone,
      typeContribuable: payload.typeContribuable || 'PARTICULIER',
      email: payload.email,
      montantImpot: 1,
    }),
  });
}

  async updateContribuable(id: string, payload: Partial<Contribuable>): Promise<Contribuable> {
  return this.api.request<Contribuable>(`/contribuables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deleteContribuable(id: string) {
  return this.api.request<{ success?: boolean }>(`/contribuables/${id}`, {
    method: 'DELETE',
  });
}

  async ensureContribuableByIdentity(input: {
  cni: string;
  fullName: string;
  telephone: string;
  adresse?: string;
}): Promise<Contribuable> {
  if (!input.cni || !input.fullName || !input.telephone) {
    throw new Error('Le CNI, le nom complet et le téléphone sont requis');
  }
  
  // First try to find by CNI - this takes priority
  const existing = await this.findContribuableByNin(input.cni);
  if (existing) {
    // If found by CNI, check if the phone number is different
    // Update the phone if needed
    if (existing.telephone !== input.telephone) {
      try {
        await this.updateContribuable(existing.id, { telephone: input.telephone });
        return { ...existing, telephone: input.telephone };
      } catch {
        // Phone might already exist on another contribuable, continue with existing
      }
    }
    return existing;
  }

  // If not found by CNI, check if this phone number already exists
  // Use the new efficient endpoint
  try {
    const result = await this.api.request<TelephoneCheckResponse>(`/contribuables/check-telephone?telephone=${encodeURIComponent(input.telephone)}`);
    if (result.exists && result.contribuable) {
      // Phone exists - return the existing record
      return result.contribuable;
    }
  } catch {
    // Fallback to old method
    try {
      const existingByPhone = await this.checkTelephoneExists(input.telephone);
      if (existingByPhone) {
        const result = await this.api.request<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(input.telephone)}&limit=1`);
        const items = normalizeContribuablesResult(result);
        if (items.length > 0) {
          return items[0];
        }
      }
    } catch {
      // Ignore fallback lookup failures and continue to creation
    }
  }

  // Try to create a new contribuable with error handling for duplicates
  const fullName = input.fullName || '';
  const chunks = fullName.trim().split(/\s+/).filter(Boolean);
  const prenom = chunks.shift() || 'Sans';
  const nom = chunks.join(' ') || 'Nom';
  
  try {
    return await this.createContribuable({
      nin: input.cni,
      nom,
      prenom,
      telephone: input.telephone,
      adresse: input.adresse,
    });
  } catch (createError) {
    // If we get a 409 conflict, it means the phone exists
    // Try one more time to find the existing record
    if (createError instanceof Error && (createError.message.includes('existe déjà') || createError.message.includes('409'))) {
      const result = await this.api.request<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(input.telephone)}&limit=1`);
      const items = normalizeContribuablesResult(result);
      if (items.length > 0) {
        return items[0];
      }
    }
    throw createError;
  }
}
}
