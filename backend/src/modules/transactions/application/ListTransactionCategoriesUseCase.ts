import type { TaxCatalog } from '../domain/TaxCatalog';

export class ListTransactionCategoriesUseCase {
  constructor(private readonly taxCatalog: TaxCatalog) {}

  async execute() {
    return this.taxCatalog.listCategories();
  }
}
