const CONTRIBUABLE_KEY = 'contribuable';
let currentContribuable: PortalContribuable | null = null;
let pendingPortalRestore: Promise<PortalContribuable | null> | null = null;

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
  currentContribuable = contribuable;
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
  currentContribuable = null;
  localStorage.removeItem(CONTRIBUABLE_KEY);
}

export function getContribuable(): PortalContribuable | null {
  if (currentContribuable) return currentContribuable;
  const raw = localStorage.getItem(CONTRIBUABLE_KEY);
  if (!raw) return null;
  try {
    currentContribuable = JSON.parse(raw) as PortalContribuable;
    return currentContribuable;
  } catch {
    localStorage.removeItem(CONTRIBUABLE_KEY);
    return null;
  }
}

export async function restorePortalSession(): Promise<PortalContribuable | null> {
  const existing = getContribuable();
  if (existing) {
    return existing;
  }

  if (pendingPortalRestore) {
    return pendingPortalRestore;
  }

  pendingPortalRestore = fetch('/api/v1/portal/auth/me', {
    credentials: 'include',
  })
    .then(async (response) => {
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.id) {
        clearPortalSession();
        return null;
      }
      savePortalSession('', json as PortalContribuable);
      return getContribuable();
    })
    .catch(() => {
      clearPortalSession();
      return null;
    })
    .finally(() => {
      pendingPortalRestore = null;
    });

  return pendingPortalRestore;
}
