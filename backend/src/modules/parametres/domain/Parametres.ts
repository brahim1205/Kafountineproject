export type MunicipalTariff = {
  id: string;
  categoryId: string;
  categorie: string;
  nom: string;
  montant: number;
  unite: string;
  description: string | null;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Penalty = {
  id: string;
  type: string;
  description: string | null;
  montant: number;
  delai: string;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Permission = {
  id: string;
  module: string;
  role: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BackupRecord = {
  id: string;
  filename: string;
  size: number;
  snapshot: string;
  restoredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PenaltyValues = Pick<Penalty, 'type' | 'description' | 'montant' | 'delai' | 'actif'>;

export interface ParametresRepository {
  ensureDefaults(): Promise<void>;
  listTariffs(): Promise<MunicipalTariff[]>;
  findTariff(id: string): Promise<MunicipalTariff | null>;
  findOrCreateTariffCategory(label: string): Promise<{ id: string; nom: string }>;
  createTariff(values: { categoryId: string; nom: string; montant: number; unite: string; actif: boolean }): Promise<string>;
  updateTariff(
    id: string,
    values: { categoryId: string; nom: string; montant: number; unite: string; actif: boolean },
    categoryDescription: string | null
  ): Promise<void>;
  deleteTariff(id: string): Promise<void>;
  listPenalties(): Promise<Penalty[]>;
  findPenalty(id: string): Promise<Penalty | null>;
  createPenalty(values: PenaltyValues): Promise<Penalty>;
  updatePenalty(id: string, values: PenaltyValues): Promise<Penalty>;
  deletePenalty(id: string): Promise<void>;
  listPermissions(): Promise<Permission[]>;
  upsertPermission(moduleName: string, role: string, enabled: boolean): Promise<void>;
}

export interface BackupStore {
  list(): Promise<BackupRecord[]>;
  findByFilename(filename: string): Promise<BackupRecord | null>;
  create(filename: string): Promise<BackupRecord>;
  restore(backup: BackupRecord): Promise<void>;
}
