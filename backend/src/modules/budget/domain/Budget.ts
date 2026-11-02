export type BudgetLine = {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BudgetRequest = {
  id: string;
  service: string;
  description: string;
  montant: number;
  statut: string;
  motif: string | null;
  year: number;
  requestedById: string | null;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BudgetLineValues = Omit<BudgetLine, 'id' | 'createdAt' | 'updatedAt'>;
export type BudgetRequestValues = Omit<BudgetRequest, 'id' | 'year' | 'requestedById' | 'createdAt' | 'updatedAt'>;

export interface BudgetRepository {
  listLines(year: number): Promise<BudgetLine[]>;
  findLineById(id: string): Promise<BudgetLine | null>;
  findLineByCode(code: string, year: number): Promise<BudgetLine | null>;
  createLine(values: BudgetLineValues): Promise<BudgetLine>;
  updateLine(id: string, values: BudgetLineValues): Promise<BudgetLine>;
  deleteLine(id: string): Promise<void>;
  listRequests(year: number): Promise<BudgetRequest[]>;
  findRequestById(id: string): Promise<BudgetRequest | null>;
  createRequest(values: Omit<BudgetRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<BudgetRequest>;
  updateRequest(id: string, values: BudgetRequestValues): Promise<BudgetRequest>;
}
