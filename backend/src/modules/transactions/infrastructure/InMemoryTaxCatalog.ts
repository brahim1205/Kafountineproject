import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { TaxCatalog } from '../domain/TaxCatalog';
import type { TransactionCategory, TransactionService } from '../domain/TransactionRepository';
import { buildRuntimeTariffMap, buildServiceId } from './municipalTariffs';

type TariffRow = {
  categoryId: string;
  categoryNom: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  categoryDescription: string | null;
  serviceNom: string;
  tarif: number;
  unite: string;
  calcul: string | null;
  sortOrder: number;
};

const fallback = buildRuntimeTariffMap();

export class InMemoryTaxCatalog implements TaxCatalog {
  listCategories() {
    return fallback.categories;
  }

  listServices(categoryId: string) {
    return fallback.servicesByCategory[categoryId] || [];
  }
}

export class PrismaTaxCatalog implements TaxCatalog {
  async listCategories(): Promise<TransactionCategory[]> {
    const rows = await this.queryRows();
    if (rows.length === 0) {
      return fallback.categories;
    }

    const seen = new Set<string>();
    const categories: TransactionCategory[] = [];
    for (const row of rows) {
      if (seen.has(row.categoryId)) {
        continue;
      }
      seen.add(row.categoryId);
      categories.push({
        id: row.categoryId,
        nom: row.categoryNom,
        icon: row.categoryIcon || undefined,
        color: row.categoryColor || undefined,
        description: row.categoryDescription || undefined,
      });
    }
    return categories;
  }

  async listServices(categoryId: string): Promise<TransactionService[]> {
    const rows = await this.queryRows(categoryId);
    if (rows.length === 0) {
      return fallback.servicesByCategory[categoryId] || [];
    }

    return rows.map((row) => ({
      id: buildServiceId(row.categoryId, row.serviceNom),
      nom: row.serviceNom,
      tarif: Number(row.tarif),
      unite: row.unite,
      calcul: row.calcul || undefined,
    }));
  }

  private async queryRows(categoryId?: string): Promise<TariffRow[]> {
    const sql = `
      SELECT
        c."id" AS "categoryId",
        c."nom" AS "categoryNom",
        c."icon" AS "categoryIcon",
        c."color" AS "categoryColor",
        c."description" AS "categoryDescription",
        i."nom" AS "serviceNom",
        i."tarif" AS "tarif",
        i."unite" AS "unite",
        i."calcul" AS "calcul",
        i."sortOrder" AS "sortOrder"
      FROM "MunicipalTariffCategory" c
      INNER JOIN "MunicipalTariffItem" i ON i."categoryId" = c."id"
      WHERE c."isActive" = true
        AND i."isActive" = true
        ${categoryId ? 'AND c."id" = $1' : ''}
      ORDER BY c."sortOrder" ASC, i."sortOrder" ASC, i."nom" ASC
    `;

    try {
      if (categoryId) {
        return await prisma.$queryRawUnsafe<TariffRow[]>(sql, categoryId);
      }

      return await prisma.$queryRawUnsafe<TariffRow[]>(sql);
    } catch {
      return [];
    }
  }
}
