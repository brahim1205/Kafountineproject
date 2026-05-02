import type { TaxCatalog } from '../domain/TaxCatalog';

export class ListTransactionCategoryServicesUseCase {
  constructor(private readonly taxCatalog: TaxCatalog) {}

  async execute(categoryId: string) {
    return this.taxCatalog.listServices(categoryId);
  }
}
