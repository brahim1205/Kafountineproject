import type { TaxCatalog } from '../domain/TaxCatalog';

export class ListTransactionCategoriesUseCase {
  constructor(private readonly taxCatalog: TaxCatalog) {}

  execute() {
    return this.taxCatalog.listCategories();
  }
}
