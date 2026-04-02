import { apiRequest } from './api';

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
  return Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
}

export async function listContribuables(params: { page?: number; limit?: number; search?: string; year?: number } = {}): Promise<Contribuable[]> {
  const query = new URLSearchParams();
  const limit = clampContribuablesLimit(params.limit);
  if (params.page) query.set('page', String(params.page));
  if (limit) query.set('limit', String(limit));
  if (params.search) query.set('search', String(params.search));
  if (params.year) query.set('year', String(params.year));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const result = await apiRequest<ContribuablesApiResult>(`/contribuables${suffix}`);
  return normalizeContribuablesResult(result);
}

export async function findContribuableByNin(nin: string): Promise<Contribuable | null> {
  const result = await apiRequest<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(nin)}&limit=20`);
  const items = normalizeContribuablesResult(result);
  const match = items.find((c) => String(c.nin) === String(nin));
  return match || null;
}

/**
 * Vérifie si un NIN (numéro d'identité) existe déjà
 */
export async function checkNinExists(nin: string, excludeId?: string): Promise<boolean> {
  const result = await apiRequest<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(nin)}&limit=50`);
  const items = normalizeContribuablesResult(result);
  const match = items.find((c) => String(c.nin) === String(nin));
  if (!match) return false;
  if (excludeId && match.id === excludeId) return false;
  return true;
}

/**
 * Vérifie si un numéro de téléphone existe déjà
 */
export async function checkTelephoneExists(telephone: string, excludeId?: string): Promise<boolean> {
  // Use the new efficient endpoint
  try {
    const result = await apiRequest<TelephoneCheckResponse>(`/contribuables/check-telephone?telephone=${encodeURIComponent(telephone)}`);
    if (!result || !result.exists) return false;
    if (excludeId && result.contribuable?.id === excludeId) return false;
    return true;
  } catch {
    const result = await apiRequest<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(telephone)}&limit=50`);
    const items = normalizeContribuablesResult(result);
    const match = items.find((c) => String(c.telephone) === String(telephone));
    if (!match) return false;
    if (excludeId && match.id === excludeId) return false;
    return true;
  }
}

/**
 * Valide les doublons avant création
 * @throws Error si un doublon est trouvé
 */
export async function validateContribuableDuplicates(
  nin: string,
  telephone: string,
  excludeId?: string
): Promise<{ ninExists: boolean; telephoneExists: boolean }> {
  const [ninExists, telephoneExists] = await Promise.all([
    checkNinExists(nin, excludeId),
    checkTelephoneExists(telephone, excludeId),
  ]);
  
  return { ninExists, telephoneExists };
}

export async function createContribuable(payload: {
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
  return apiRequest<Contribuable>('/contribuables', {
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

export async function updateContribuable(id: string, payload: Partial<Contribuable>): Promise<Contribuable> {
  return apiRequest<Contribuable>(`/contribuables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteContribuable(id: string) {
  return apiRequest<{ success?: boolean }>(`/contribuables/${id}`, {
    method: 'DELETE',
  });
}

export async function ensureContribuableByIdentity(input: {
  cni: string;
  fullName: string;
  telephone: string;
  adresse?: string;
}): Promise<Contribuable> {
  if (!input.cni || !input.fullName || !input.telephone) {
    throw new Error('Le CNI, le nom complet et le téléphone sont requis');
  }
  
  // First try to find by CNI - this takes priority
  const existing = await findContribuableByNin(input.cni);
  if (existing) {
    // If found by CNI, check if the phone number is different
    // Update the phone if needed
    if (existing.telephone !== input.telephone) {
      try {
        await updateContribuable(existing.id, { telephone: input.telephone });
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
    const result = await apiRequest<TelephoneCheckResponse>(`/contribuables/check-telephone?telephone=${encodeURIComponent(input.telephone)}`);
    if (result.exists && result.contribuable) {
      // Phone exists - return the existing record
      return result.contribuable;
    }
  } catch {
    // Fallback to old method
    try {
      const existingByPhone = await checkTelephoneExists(input.telephone);
      if (existingByPhone) {
        const result = await apiRequest<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(input.telephone)}&limit=1`);
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
    return await createContribuable({
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
      const result = await apiRequest<ContribuablesApiResult>(`/contribuables?search=${encodeURIComponent(input.telephone)}&limit=1`);
      const items = normalizeContribuablesResult(result);
      if (items.length > 0) {
        return items[0];
      }
    }
    throw createError;
  }
}
