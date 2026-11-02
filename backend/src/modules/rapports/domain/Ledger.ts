export type LedgerEntry = {
  id: string;
  date: Date;
  person: string;
  type: string;
  amount: number;
  description: string;
  module: string;
};

/** Journal consolidé des recettes et dépenses de l'année, tous services confondus. */
export interface LedgerSource {
  entriesForYear(year: number): Promise<LedgerEntry[]>;
}
