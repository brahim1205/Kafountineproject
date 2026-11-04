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

/** Critères de recherche des tickets ; les dates (AAAA-MM-JJ) bornent la date de paiement, fin incluse. */
export type TransactionCriteria = {
  search?: string;
  categorie?: string;
  /** Toutes les valeurs stockées d'une même catégorie (« etat-civil », « ETAT_CIVIL »…) ; prioritaire sur `categorie`. */
  categories?: string[];
  statut?: string;
  year?: number;
  agentId?: string;
  startDate?: string;
  endDate?: string;
};

export type TransactionFilters = TransactionCriteria & {
  page: number;
  limit: number;
};

export type DateRange = { from: Date; to: Date };

export type PaidByCategory = { categorie: string; montant: number; nombre: number };

/** Ligne d'export CSV d'un ticket. */
export type TransactionExportRow = {
  numero: string;
  date: Date;
  categorie: string;
  service: string;
  montant: number;
  statut: string;
  modePaiement: string;
  contribuable: string;
  nin: string;
  agent: string;
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
  /** Montant encaissé (statut PAYE) correspondant aux critères, calculé en base. */
  sumPaid(criteria: TransactionCriteria): Promise<{ montant: number; nombre: number }>;
  /** Recettes encaissées de l'année par catégorie, sur une période si elle est donnée (agrégées en base). */
  paidByCategory(year: number, range?: DateRange): Promise<PaidByCategory[]>;
  /** Valeurs de catégorie présentes dans les tickets de l'année, avec leur nombre de tickets. */
  usedCategories(year?: number): Promise<Array<{ categorie: string; nombre: number }>>;
  /** Nombre et montant de tous les tickets de l'année, quel que soit leur statut. */
  yearTotals(year: number): Promise<{ nombre: number; montant: number }>;
  /** Parcourt les tickets correspondant aux critères par lots, du plus récent au plus ancien. */
  iterateForExport(criteria: TransactionCriteria, batchSize?: number): AsyncGenerator<TransactionExportRow[]>;
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
