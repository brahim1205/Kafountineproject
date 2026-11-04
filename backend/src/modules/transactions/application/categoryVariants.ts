import type { TaxCatalog } from '../domain/TaxCatalog';
import type { TransactionCriteria, TransactionRepository } from '../domain/TransactionRepository';
import { buildCategoryLabeler } from './categoryLabels';

/**
 * Remplace la catégorie demandée par toutes les valeurs stockées qui portent le même libellé :
 * filtrer sur « etat-civil » retrouve aussi les tickets enregistrés « ETAT_CIVIL » ou « État civil ».
 */
export async function withCategoryVariants(
  criteria: TransactionCriteria,
  repository: TransactionRepository,
  catalog?: TaxCatalog
): Promise<TransactionCriteria> {
  if (!criteria.categorie) return criteria;
  const [used, label] = await Promise.all([repository.usedCategories(criteria.year), buildCategoryLabeler(catalog)]);
  const target = label(criteria.categorie);
  const categories = [...new Set([criteria.categorie, ...used.map((row) => row.categorie).filter((value) => label(value) === target)])];
  return { ...criteria, categories };
}
