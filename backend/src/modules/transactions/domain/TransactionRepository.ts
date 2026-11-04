export type TransactionCategory = {
  id: string;
  nom: string;
  icon?: string;
  color?: string;
  description?: string;
};

export type TransactionService = {
  id: string;
  nom: string;
  tarif: number;
  unite: string;
  calcul?: string;
};

export type TransactionFilters = {
  page: number;
  limit: number;
  search?: string;
  categorie?: string;
  statut?: string;
  year?: number;
};

export type CreateTransactionPayload = {
  contribuableId: string;
  agentId: string;
  categorie: string;
  service: string;
  quantite: number;
  montant: number;
  modePaiement: string;
  statut: string;
  date: Date;
  year: number;
  numero: string;
};

export interface TransactionRepository {
  search(filters: TransactionFilters): Promise<unknown[]>;
  count(filters: TransactionFilters): Promise<number>;
  countByYear(year: number): Promise<number>;
  create(payload: CreateTransactionPayload): Promise<unknown>;
  createWithAtomicNumero(payload: Omit<CreateTransactionPayload, 'numero'>): Promise<{ numero: string; service: string; montant: unknown }>;
  findByYear(year: number): Promise<Array<{ montant: number; statut: string; categorie: string; date: Date }>>;
  findRecentByYear(year: number, limit: number): Promise<unknown[]>;
  findByContribuableId(contribuableId: string): Promise<Array<{ id: string; numero: string; categorie: string; service: string; year: number; montant: number; statut: string; date: Date }>>;
  findPortalPayables(contribuableId: string, transactionIds: string[]): Promise<Array<{ id: string; numero: string; montant: number; statut: string }>>;
  markPortalPaymentAsPaid(contribuableId: string, transactionIds: string[], modePaiement: string): Promise<Array<{ id: string; numero: string; montant: number; statut: string; service: string; date: Date }>>;
  findDetailsById(transactionId: string): Promise<{
    id: string;
    numero: string;
    categorie: string;
    service: string;
    montant: number;
    statut: string;
    modePaiement: string;
    date: Date;
    contribuable: {
      id: string;
      nom: string;
      prenom: string;
      nin: string;
      telephone: string;
    };
  } | null>;
  update(id: string, payload: Partial<CreateTransactionPayload>): Promise<unknown>;
  findSummaryById(id: string): Promise<{ numero: string; montant: number; service: string } | null>;
  delete(id: string): Promise<void>;
}
