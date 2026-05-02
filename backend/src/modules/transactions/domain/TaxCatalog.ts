import type { TransactionCategory, TransactionService } from './TransactionRepository';

export interface TaxCatalog {
  listCategories(): TransactionCategory[] | Promise<TransactionCategory[]>;
  listServices(categoryId: string): TransactionService[] | Promise<TransactionService[]>;
}
