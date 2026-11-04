import type { TaxCatalog } from '../domain/TaxCatalog';
import type { TransactionRepository } from '../domain/TransactionRepository';
import { buildCategoryLabeler } from './categoryLabels';

/**
 * Catégories présentes dans les tickets de l'année, une par libellé, pour les filtres des listes.
 * `valeur` est l'une des formes stockées : le serveur étend le filtre à toutes les formes du libellé.
 */
export class ListUsedCategoriesUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly taxCatalog?: TaxCatalog
  ) {}

  async execute(year: number) {
    const [rows, label] = await Promise.all([this.transactionRepository.usedCategories(year), buildCategoryLabeler(this.taxCatalog)]);
    const byLabel = new Map<string, { valeur: string; libelle: string; nombre: number }>();
    for (const row of rows) {
      const libelle = label(row.categorie);
      const current = byLabel.get(libelle);
      byLabel.set(libelle, { valeur: current?.valeur ?? row.categorie, libelle, nombre: (current?.nombre ?? 0) + row.nombre });
    }
    return [...byLabel.values()].sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
  }
}
