import type { Contribuable } from './Contribuable';

export type ContribuableFilters = {
  search?: string;
  page: number;
  limit: number;
};

export type CreateContribuablePayload = {
  nin: string;
  nom: string;
  prenom: string;
  dateNaiss: Date;
  lieuNaiss: string;
  adresse: string;
  telephone: string;
  email?: string | null;
  profession?: string | null;
  typeContribuable?: string;
  zone?: string | null;
  montantImpot?: number;
  isActive?: boolean;
};

export type UpdateContribuablePayload = Partial<CreateContribuablePayload>;

export interface ContribuableRepository {
  findById(id: string): Promise<Contribuable | null>;
  findByNin(nin: string): Promise<Contribuable | null>;
  findByTelephone(telephone: string): Promise<Contribuable | null>;
  search(filters: ContribuableFilters): Promise<Contribuable[]>;
  count(filters: ContribuableFilters): Promise<number>;
  create(payload: CreateContribuablePayload): Promise<Contribuable>;
  update(id: string, payload: UpdateContribuablePayload): Promise<Contribuable>;
  delete(id: string): Promise<void>;
}
