const CONTRIBUABLE_KEY = 'contribuable';

export type PortalContribuable = {
  id: string;
  nin?: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
  email?: string;
};

export function getPortalToken(): string | null {
  return null;
}

export function isPortalAuthenticated(): boolean {
  return getContribuable() !== null;
}

export function savePortalSession(_token: string, contribuable: PortalContribuable): void {
  localStorage.setItem(CONTRIBUABLE_KEY, JSON.stringify(contribuable));
}

export async function logoutPortalRequest(): Promise<void> {
  try {
    await fetch('/api/v1/portal/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearPortalSession();
  }
}

export function clearPortalSession(): void {
  localStorage.removeItem(CONTRIBUABLE_KEY);
}

export function getContribuable(): PortalContribuable | null {
  const raw = localStorage.getItem(CONTRIBUABLE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PortalContribuable;
  } catch {
    localStorage.removeItem(CONTRIBUABLE_KEY);
    return null;
  }
}
