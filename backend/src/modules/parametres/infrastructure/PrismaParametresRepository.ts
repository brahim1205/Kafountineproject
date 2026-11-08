import { randomUUID } from 'node:crypto';
import { db } from '../../../shared/infrastructure/prisma/transactionContext';
import { slugify } from '../../transactions/infrastructure/municipalTariffs';
import type { MunicipalTariff, ParametresRepository, Penalty, PenaltyValues, Permission } from '../domain/Parametres';

const SELECT_TARIFF = `SELECT
        i."id",
        c."id" AS "categoryId",
        c."nom" AS "categorie",
        i."nom",
        i."tarif" AS "montant",
        i."unite",
        c."description" AS "description",
        i."isActive" AS "actif",
        i."createdAt",
        i."updatedAt"
      FROM "MunicipalTariffItem" i
      INNER JOIN "MunicipalTariffCategory" c ON c."id" = i."categoryId"`;

const DEFAULT_PERMISSION_MODULES = [
  'Dashboard',
  'Contribuables',
  'Recettes',
  'Taxes',
  'Utilisateurs',
  'Audit',
  'Budget',
  'État civil',
  'Urbanisme',
  'Marché',
  'Motos',
  'Formations',
  'Quai de pêche',
  'Paramètres',
];

const DEFAULT_ROLE_MODULES: Record<string, string[] | 'all'> = {
  AGENT: ['Dashboard', 'Contribuables', 'Recettes', 'Taxes', 'État civil', 'Urbanisme', 'Marché', 'Motos', 'Formations', 'Quai de pêche'],
  SUPERVISEUR: ['Dashboard', 'Contribuables', 'Recettes', 'Taxes', 'État civil', 'Urbanisme'],
  ADMIN: 'all',
  SUPER_ADMIN: 'all',
};

const SQL_LIST_TARIFFS = `${SELECT_TARIFF}
      ORDER BY c."sortOrder" ASC, i."sortOrder" ASC, i."nom" ASC`;
const SQL_FIND_TARIFF = `${SELECT_TARIFF}
      WHERE i."id" = $1 LIMIT 1`;

export class PrismaParametresRepository implements ParametresRepository {
  async ensureDefaults() {
    const [tariffCount, penaltyCount, permissionCount] = await Promise.all([
      db().$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingTariff"'),
      db().$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingPenalty"'),
      db().$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingPermission"'),
    ]);

    if (Number(tariffCount[0]?.count || 0) === 0) {
      await db().$executeRaw`
        INSERT INTO "AppSettingTariff" ("id", "categorie", "nom", "montant", "unite", "description", "actif", "createdAt", "updatedAt")
        VALUES
        (${randomUUID()}, ${'État Civil'}, ${'Extrait de naissance'}, ${1000}, ${'FCFA'}, ${'Délivrance standard d’un extrait'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Urbanisme'}, ${'Permis de construire'}, ${600000}, ${'FCFA'}, ${'Instruction complète du permis'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Marché'}, ${'Occupation place mensuelle'}, ${5000}, ${'FCFA/mois'}, ${'Place standard marché central'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Transport'}, ${'Licence moto-taxi'}, ${1000}, ${'FCFA/mois'}, ${'Paiement mensuel moto-taxi'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    if (Number(penaltyCount[0]?.count || 0) === 0) {
      await db().$executeRaw`
        INSERT INTO "AppSettingPenalty" ("id", "type", "description", "montant", "delai", "actif", "createdAt", "updatedAt")
        VALUES
        (${randomUUID()}, ${'Retard paiement marché'}, ${'Majoration appliquée après échéance mensuelle'}, ${1500}, ${'5 jours après échéance'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Retard dossier urbanisme'}, ${'Frais complémentaires en cas de dossier incomplet prolongé'}, ${5000}, ${'10 jours après notification'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Retard moto-taxi'}, ${'Pénalité standard de régularisation'}, ${10000}, ${'Immédiatement après échéance'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    if (Number(permissionCount[0]?.count || 0) === 0) {
      for (const moduleName of DEFAULT_PERMISSION_MODULES) {
        for (const [role, modules] of Object.entries(DEFAULT_ROLE_MODULES)) {
          const enabled = modules === 'all' || modules.includes(moduleName);
          await db().$executeRaw`
            INSERT INTO "AppSettingPermission" ("id", "module", "role", "enabled", "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${moduleName}, ${role}, ${enabled}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
        }
      }
    }
  }

  listTariffs() {
    return db().$queryRawUnsafe<MunicipalTariff[]>(SQL_LIST_TARIFFS);
  }

  async findTariff(id: string) {
    const [row] = await db().$queryRawUnsafe<MunicipalTariff[]>(SQL_FIND_TARIFF, id);
    return row || null;
  }

  async findOrCreateTariffCategory(label: string) {
    const normalized = label.trim();
    const [existingByName] = await db().$queryRawUnsafe<Array<{ id: string; nom: string }>>(
      `SELECT "id", "nom" FROM "MunicipalTariffCategory" WHERE LOWER("nom") = LOWER($1) LIMIT 1`,
      normalized
    );
    if (existingByName) {
      return existingByName;
    }

    const id = slugify(normalized) || randomUUID();
    const [existingById] = await db().$queryRawUnsafe<Array<{ id: string; nom: string }>>(
      `SELECT "id", "nom" FROM "MunicipalTariffCategory" WHERE "id" = $1 LIMIT 1`,
      id
    );
    if (existingById) {
      return existingById;
    }

    const [max] = await db().$queryRawUnsafe<Array<{ max: number | null }>>(
      `SELECT MAX("sortOrder")::int AS "max" FROM "MunicipalTariffCategory"`
    );
    const sortOrder = Number(max?.max ?? -1) + 1;
    await db().$executeRaw`
      INSERT INTO "MunicipalTariffCategory" ("id", "nom", "sortOrder", "isActive", "createdAt", "updatedAt")
      VALUES (${id}, ${normalized}, ${sortOrder}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    return { id, nom: normalized };
  }

  async createTariff(values: { categoryId: string; nom: string; montant: number; unite: string; actif: boolean }) {
    const itemId = randomUUID();
    const [max] = await db().$queryRawUnsafe<Array<{ max: number | null }>>(
      `SELECT MAX("sortOrder")::int AS "max" FROM "MunicipalTariffItem" WHERE "categoryId" = $1`,
      values.categoryId
    );
    const sortOrder = Number(max?.max ?? -1) + 1;

    await db().$executeRaw`
      INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
      VALUES (${itemId}, ${values.categoryId}, ${values.nom}, ${values.montant}, ${values.unite}, NULL, NULL, NULL, ${sortOrder}, ${values.actif}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    return itemId;
  }

  async updateTariff(
    id: string,
    values: { categoryId: string; nom: string; montant: number; unite: string; actif: boolean },
    categoryDescription: string | null
  ) {
    await db().$executeRaw`
      UPDATE "MunicipalTariffCategory"
      SET "description" = ${categoryDescription}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${values.categoryId}
    `;

    await db().$executeRaw`
      UPDATE "MunicipalTariffItem"
      SET "categoryId" = ${values.categoryId},
          "nom" = ${values.nom},
          "tarif" = ${values.montant},
          "unite" = ${values.unite},
          "isActive" = ${values.actif},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;
  }

  async deleteTariff(id: string) {
    await db().$executeRaw`DELETE FROM "MunicipalTariffItem" WHERE "id" = ${id}`;
  }

  listPenalties() {
    return db().$queryRawUnsafe<Penalty[]>('SELECT * FROM "AppSettingPenalty" ORDER BY "type" ASC');
  }

  async findPenalty(id: string) {
    const [row] = await db().$queryRawUnsafe<Penalty[]>('SELECT * FROM "AppSettingPenalty" WHERE "id" = $1 LIMIT 1', id);
    return row || null;
  }

  async createPenalty(values: PenaltyValues) {
    const [row] = await db().$queryRawUnsafe<Penalty[]>(
      'INSERT INTO "AppSettingPenalty" ("id", "type", "description", "montant", "delai", "actif", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      randomUUID(),
      values.type,
      values.description,
      values.montant,
      values.delai,
      values.actif
    );
    return row;
  }

  async updatePenalty(id: string, values: PenaltyValues) {
    const [row] = await db().$queryRawUnsafe<Penalty[]>(
      'UPDATE "AppSettingPenalty" SET "type" = $2, "description" = $3, "montant" = $4, "delai" = $5, "actif" = $6, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING *',
      id,
      values.type,
      values.description,
      values.montant,
      values.delai,
      values.actif
    );
    return row;
  }

  async deletePenalty(id: string) {
    await db().$executeRaw`DELETE FROM "AppSettingPenalty" WHERE "id" = ${id}`;
  }

  listPermissions() {
    return db().$queryRawUnsafe<Permission[]>('SELECT * FROM "AppSettingPermission" ORDER BY "module" ASC, "role" ASC');
  }

  async upsertPermission(moduleName: string, role: string, enabled: boolean) {
    const existing = await db().$queryRawUnsafe<Permission[]>(
      'SELECT * FROM "AppSettingPermission" WHERE "module" = $1 AND "role" = $2 LIMIT 1',
      moduleName,
      role
    );

    if (existing[0]) {
      await db().$executeRaw`
        UPDATE "AppSettingPermission"
        SET "enabled" = ${enabled}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "module" = ${moduleName} AND "role" = ${role}
      `;
    } else {
      await db().$executeRaw`
        INSERT INTO "AppSettingPermission" ("id", "module", "role", "enabled", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${moduleName}, ${role}, ${enabled}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }
  }
}
