export type UiRole = 'admin' | 'super_admin' | 'agent' | 'service_finances' | 'quai_peche' | 'etat_civil' | 'regisseur';

export interface ApiAuthUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface StoredSession {
  userId: string;
  userRole: UiRole;
  userName: string;
  userInitials: string;
}

export type CurrentUser = ApiAuthUser;

/** Rôle de la session, pour les constantes hors composant. */
export function storedRole(): UiRole | null {
  try {
    return (JSON.parse(sessionStorage.getItem('auth_session') ?? 'null') as StoredSession | null)?.userRole ?? null;
  } catch {
    return null;
  }
}
