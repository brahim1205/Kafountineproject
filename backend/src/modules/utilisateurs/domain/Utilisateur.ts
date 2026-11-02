export type Utilisateur = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  telephone: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type UtilisateurValues = {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  telephone: string | null;
  isActive?: boolean;
  passwordHash?: string;
};

export interface UtilisateurRepository {
  search(search: string): Promise<Utilisateur[]>;
  findById(id: string): Promise<Utilisateur | null>;
  findByEmail(email: string): Promise<Utilisateur | null>;
  countTransactions(id: string): Promise<number | null>;
  create(values: UtilisateurValues & { passwordHash: string }): Promise<Utilisateur>;
  update(id: string, values: UtilisateurValues): Promise<Utilisateur>;
  deactivate(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}
