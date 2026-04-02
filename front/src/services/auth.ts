import { resolveApiBaseUrl } from './apiBaseUrl';

type LoginPayload = {
  email: string;
  password: string;
};

type ApiAuthUser = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
};

type LoginResponse = {
  user: ApiAuthUser;
  token: string;
  accessToken: string;
  refreshToken: string;
};

type StoredSession = {
  userId: string;
  userRole: UiRole;
  userName: string;
  userInitials: string;
};

export type CurrentUser = ApiAuthUser;
export type UiRole = 'admin' | 'super_admin' | 'agent' | 'comptable' | 'service_finances' | 'quai_peche';

const SESSION_STORAGE_KEY = 'auth_session';
const API_BASE_URL = resolveApiBaseUrl();

function roleToUiRole(role: string): UiRole {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return 'admin';
    case 'SUPER_ADMIN':
      return 'super_admin';
    case 'COMPTABLE':
      return 'comptable';
    case 'SERVICE_FINANCES':
      return 'service_finances';
    case 'QUAI_PECHE':
      return 'quai_peche';
    default:
      return 'agent';
  }
}

function getInitials(prenom: string, nom: string): string {
  const p = (prenom || '').trim().charAt(0).toUpperCase();
  const n = (nom || '').trim().charAt(0).toUpperCase();
  return `${p}${n}` || 'US';
}

function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(value: StoredSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('userId', value.userId);
  localStorage.setItem('userRole', value.userRole);
  localStorage.setItem('userName', value.userName);
  localStorage.setItem('userInitials', value.userInitials);
}

function storeCurrentUser(user: ApiAuthUser) {
  const userRole = roleToUiRole(user.role);
  const userName = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email;

  writeStoredSession({
    userId: user.id,
    userRole,
    userName,
    userInitials: getInitials(user.prenom, user.nom),
  });
}

export function getAuthToken(): string | null {
  return null;
}

export function getRefreshToken(): string | null {
  return null;
}

export function isAuthenticated(): boolean {
  return readStoredSession() !== null;
}

export function getStoredUserRole(): UiRole | null {
  return readStoredSession()?.userRole || null;
}

export function getStoredUserName(): string {
  return readStoredSession()?.userName || '';
}

export function getStoredUserId(): string | null {
  return readStoredSession()?.userId || null;
}

export function getStoredUserInitials(): string {
  return readStoredSession()?.userInitials || '';
}

export function hasRole(roles: UiRole[]): boolean {
  const role = getStoredUserRole();
  return role ? roles.includes(role) : false;
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Impossible de contacter le serveur de connexion');
  }

  return json.data as LoginResponse;
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      clearSession();
      return null;
    }

    return json.data?.accessToken || null;
  } catch {
    clearSession();
    return null;
  }
}

export async function logoutRequest(_token?: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearSession();
  }
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Impossible de traiter la demande de reinitialisation');
  }

  return json.message || 'Si un compte existe avec cet email, un lien de reinitialisation sera envoye';
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include',
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Impossible de recuperer le profil utilisateur');
  }

  const user = json.data as CurrentUser;
  storeCurrentUser(user);
  return user;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userInitials');
}

export function saveSession(session: LoginResponse): void {
  storeCurrentUser(session.user);
}
