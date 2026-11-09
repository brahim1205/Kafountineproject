import { clearSession, getAuthToken, hasStoredSession, refreshAccessToken } from './auth';
import { resolveApiBaseUrl } from './apiBaseUrl';

/** Erreur renvoyée par l'API : son message, rédigé par le serveur, est montré tel quel à l'utilisateur. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type PageMeta = { counts?: Record<string, number>; somme?: number; page: number; limit: number; total: number; totalPages?: number; montantPaye?: number; nombrePaye?: number };

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  meta?: PageMeta;
};

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const API_BASE_URL = resolveApiBaseUrl();

export type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  timeout?: number;
  retries?: number;
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429 && attempt < retries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return (await requestEnvelope<T>(path, options)).data;
}

/** Comme apiRequest, en gardant la pagination renvoyée par l'API (meta.total). */
export async function apiRequestWithMeta<T>(path: string, options: ApiRequestOptions = {}): Promise<{ data: T; meta?: PageMeta }> {
  const envelope = await requestEnvelope<T>(path, options);
  return { data: envelope.data, meta: envelope.meta };
}

/**
 * Télécharge un fichier produit par l'API (export CSV…), avec la même authentification que les
 * autres requêtes, y compris le renouvellement de session. Délai long : un export d'une année
 * complète peut compter plusieurs dizaines de milliers de lignes.
 */
export async function apiDownload(path: string, filename: string, timeout = 5 * 60_000): Promise<void> {
  const send = (token: string | null) => {
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(`${API_BASE_URL}${path}`, { credentials: 'include', headers, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  let response = await send(getAuthToken());
  if (response.status === 401 && hasStoredSession()) {
    const newToken = await refreshAccessToken();
    if (newToken !== null) response = await send(newToken || null);
  }
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.message || 'Le téléchargement a échoué.');
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function requestEnvelope<T>(path: string, options: ApiRequestOptions): Promise<ApiEnvelope<T>> {
  const { auth = true, timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES, headers, ...rest } = options;
  const authToken = getAuthToken();

  const requestHeaders = new Headers(headers || {});
  if (!requestHeaders.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (auth && authToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let response = await fetchWithRetry(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...rest,
      headers: requestHeaders,
      signal: controller.signal,
    }, retries);

    clearTimeout(timeoutId);

    // Handle 401 with token refresh
    if (response.status === 401 && auth && hasStoredSession()) {
      const newToken = await refreshAccessToken();
      if (newToken !== null) {
        if (newToken) {
          requestHeaders.set('Authorization', `Bearer ${newToken}`);
        } else {
          requestHeaders.delete('Authorization');
        }
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), timeout);
        try {
          response = await fetch(`${API_BASE_URL}${path}`, {
            credentials: 'include',
            ...rest,
            headers: requestHeaders,
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);
        } catch {
          clearTimeout(retryTimeoutId);
          throw new Error('La requête a échoué après le rafraîchissement du token.');
        }
      } else {
        clearSession();
        window.location.href = '/login';
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      if (response.status === 401) {
        clearSession();
        window.location.href = '/login';
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      // Gestion speciale pour 409 (conflict - donnees deja existantes)
      if (response.status === 409) {
        throw new ApiError(json?.message || 'Ces données existent déjà. Veuillez vérifier le NIN ou le téléphone.', 409);
      }
      // Gestion spéciale pour 403 (forbidden)
      if (response.status === 403) {
        throw new ApiError(json?.message || 'Permissions insuffisantes pour cette action.', 403);
      }
      throw new ApiError(
        json?.message ||
          `L'action a échoué côté serveur (code ${response.status}). Veuillez vérifier les informations saisies.`,
        response.status,
      );
    }

    return json as ApiEnvelope<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Réponse de l'API : son message explique le refus (« période déjà payée »…), on le garde.
    if (error instanceof ApiError) {
      throw error;
    }

    // If it's already an Error with a message we set, rethrow it
    if (error instanceof Error) {
      // These are our custom handled errors - keep their messages
      if (error.message.includes('Session expirée') ||
          error.message.includes('données existent déjà') ||
          error.message.includes('Permissions insuffisantes') ||
          error.message.includes('côté serveur')) {
        throw error;
      }
      
      // Network errors - connection refused means backend is down
      if (error.name === 'AbortError') {
        throw new Error('La requête a expiré. Veuillez réessayer.');
      }
      
      // Check for fetch/network errors
      const errorStr = String(error);
      if (errorStr.includes('Failed to fetch') || 
          errorStr.includes('NetworkError') ||
          errorStr.includes('Network request failed') ||
          errorStr.includes('ERR_CONNECTION_REFUSED') ||
          errorStr.includes('Connection refused')) {
        throw new Error('Impossible de se connecter au serveur. Veuillez vérifier que le backend est en cours d\'exécution.');
      }
    }
    
    // For any other unexpected errors - check if it's a 409-like message from backend
    const errorStr = String(error);
    if (errorStr.includes('409') || errorStr.includes('existe déjà') || errorStr.includes('déjà utilisé')) {
      throw new Error('Un contribuable avec ces coordonnées existe déjà.');
    }
    
    throw new Error(
      "L'action n'a pas pu être terminée. Vérifiez les informations saisies puis réessayez.",
    );
  }
}
