import type { TransactionCategory, TransactionService } from './TransactionRepository';

export interface TaxCatalog {
  listCategories(): TransactionCategory[];
  listServices(categoryId: string): TransactionService[];
}
