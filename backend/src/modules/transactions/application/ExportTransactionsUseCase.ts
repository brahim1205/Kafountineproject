import type { TaxCatalog } from '../domain/TaxCatalog';
import type { TransactionCriteria, TransactionRepository } from '../domain/TransactionRepository';
import { buildCategoryLabeler } from './categoryLabels';
import { withCategoryVariants } from './categoryVariants';

const HEADER = ['Numéro', 'Date', 'Heure', 'Catégorie', 'Service', 'Contribuable', 'NIN', 'Agent', 'Montant', 'Statut', 'Mode de paiement'];

/** Échappement CSV (RFC 4180), identique à celui de front/src/utils/csv.ts. */
function cell(value: string | number) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const line = (values: Array<string | number>) => `${values.map(cell).join(',')}\r\n`;

/**
 * Export CSV des tickets, produit au fil de l'eau par lots : 50 000 tickets ou plus
 * s'exportent sans être chargés en mémoire d'un coup.
 */
export class ExportTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly taxCatalog?: TaxCatalog
  ) {}

  async *execute(criteria: TransactionCriteria): AsyncGenerator<string> {
    const label = await buildCategoryLabeler(this.taxCatalog);
    // BOM : Excel lit alors correctement les accents.
    yield `\uFEFF${line(HEADER)}`;
    const filters = await withCategoryVariants(criteria, this.transactionRepository, this.taxCatalog);
    for await (const batch of this.transactionRepository.iterateForExport(filters)) {
      yield batch
        .map((row) =>
          line([
            row.numero,
            row.date.toISOString().slice(0, 10),
            row.date.toISOString().slice(11, 16),
            label(row.categorie),
            row.service,
            row.contribuable,
            row.nin,
            row.agent,
            row.montant,
            row.statut,
            row.modePaiement,
          ])
        )
        .join('');
    }
  }
}
