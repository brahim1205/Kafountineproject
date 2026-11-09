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
