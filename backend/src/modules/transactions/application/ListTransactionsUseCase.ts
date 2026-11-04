import type { TaxCatalog } from '../domain/TaxCatalog';
import type { TransactionFilters, TransactionRepository } from '../domain/TransactionRepository';
import { withCategoryVariants } from './categoryVariants';

export class ListTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly taxCatalog?: TaxCatalog
  ) {}

  async execute(input: TransactionFilters) {
    const filters = { ...input, ...(await withCategoryVariants(input, this.transactionRepository, this.taxCatalog)) };
    const [data, total, paye] = await Promise.all([
      this.transactionRepository.search(filters),
      this.transactionRepository.count(filters),
      this.transactionRepository.sumPaid(filters),
    ]);

    return {
      data,
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
        // Encaissé sur toute la sélection (pas seulement la page), calculé en base.
        montantPaye: paye.montant,
        nombrePaye: paye.nombre,
      },
    };
  }
}
