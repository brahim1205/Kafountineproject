import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import { ValidationError } from '../../../shared/errors/AppError';
import type { BackupRecord, BackupStore } from '../domain/Parametres';

const BACKUP_TABLES = [
  'User',
  'Contribuable',
  'Transaction',
  'BudgetLine',
  'BudgetRequest',
  'AuditLog',
  'EtatCivilRequest',
  'UrbanismeCase',
  'MarketPlace',
  'MarketPayment',
  'MotoRegistration',
  'MotoPayment',
  'TrainingProgram',
  'YouthProfile',
  'YouthEnrollment',
  'Fisherman',
  'FishingBoat',
  'FishCommission',
  'RefrigeratedTruck',
  'ShippingExpedition',
  'AppSettingTariff',
  'AppSettingPenalty',
  'AppSettingPermission',
] as const;

const DELETE_ORDER = [
  'Transaction',
  'BudgetRequest',
  'AuditLog',
  'EtatCivilRequest',
  'UrbanismeCase',
  'MarketPayment',
  'MarketPlace',
  'MotoPayment',
  'MotoRegistration',
  'YouthEnrollment',
  'FishingBoat',
  'FishCommission',
  'ShippingExpedition',
  'TrainingProgram',
  'YouthProfile',
  'Fisherman',
  'RefrigeratedTruck',
  'AppSettingTariff',
  'AppSettingPenalty',
  'AppSettingPermission',
  'BudgetLine',
  'Contribuable',
  'User',
];

const INSERT_ORDER = [
  'User',
  'Contribuable',
  'BudgetLine',
  'AppSettingTariff',
  'AppSettingPenalty',
  'AppSettingPermission',
  'TrainingProgram',
  'YouthProfile',
  'Fisherman',
  'RefrigeratedTruck',
  'MarketPlace',
  'MotoRegistration',
  'BudgetRequest',
  'AuditLog',
  'EtatCivilRequest',
  'UrbanismeCase',
  'Transaction',
  'MarketPayment',
  'MotoPayment',
  'YouthEnrollment',
  'FishingBoat',
  'FishCommission',
  'ShippingExpedition',
];

const SQL_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quoteIdentifier(identifier: string) {
  if (!SQL_IDENTIFIER_REGEX.test(identifier)) {
    throw new ValidationError(`Identifiant SQL invalide: ${identifier}`);
  }

  return `"${identifier}"`;
}

export class PrismaBackupStore implements BackupStore {
  list() {
    return prisma.$queryRawUnsafe<BackupRecord[]>('SELECT * FROM "BackupRecord" ORDER BY "createdAt" DESC');
  }

  async findByFilename(filename: string) {
    const [row] = await prisma.$queryRawUnsafe<BackupRecord[]>(
      'SELECT * FROM "BackupRecord" WHERE "filename" = $1 LIMIT 1',
      filename
    );
    return row || null;
  }

  async create(filename: string) {
    const snapshotText = JSON.stringify(await this.buildSnapshot());
    const [row] = await prisma.$queryRawUnsafe<BackupRecord[]>(
      'INSERT INTO "BackupRecord" ("id", "filename", "size", "snapshot", "restoredAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      randomUUID(),
      filename,
      Buffer.byteLength(snapshotText, 'utf8'),
      snapshotText
    );
    return row;
  }

  async restore(backup: BackupRecord) {
    await this.restoreSnapshot(backup.snapshot);
    await prisma.$executeRaw`
      UPDATE "BackupRecord"
      SET "restoredAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${backup.id}
    `;
  }

  private async buildSnapshot() {
    const snapshot: Record<string, unknown[]> = {};
    for (const table of BACKUP_TABLES) {
      snapshot[table] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM ${quoteIdentifier(table)} ORDER BY 1 ASC`
      );
    }

    return {
      version: 1,
      createdAt: new Date().toISOString(),
      tables: snapshot,
    };
  }

  private async restoreSnapshot(snapshotText: string) {
    let parsed: { tables?: Record<string, Record<string, unknown>[]> };
    try {
      parsed = JSON.parse(snapshotText);
    } catch {
      throw new ValidationError('Le contenu de la sauvegarde est invalide.');
    }

    const tables = parsed.tables;
    if (!tables || typeof tables !== 'object') {
      throw new ValidationError('Le format de la sauvegarde est invalide.');
    }

    const allowedTableNames = new Set<string>(BACKUP_TABLES);
    for (const tableName of Object.keys(tables)) {
      if (!allowedTableNames.has(tableName)) {
        throw new ValidationError(`Table non autorisée dans la sauvegarde: ${tableName}`);
      }
    }

    const dbColumns = await prisma.$queryRawUnsafe<Array<{ tableName: string; columnName: string; dataType: string }>>(
      `SELECT "table_name" AS "tableName", "column_name" AS "columnName", "udt_name" AS "dataType"
       FROM "information_schema"."columns"
       WHERE "table_schema" = 'public'`
    );
    const columnTypesByTable = new Map<string, Map<string, string>>();
    for (const row of dbColumns) {
      if (!allowedTableNames.has(row.tableName)) {
        continue;
      }
      const columnTypes = columnTypesByTable.get(row.tableName) || new Map<string, string>();
      columnTypes.set(row.columnName, row.dataType);
      columnTypesByTable.set(row.tableName, columnTypes);
    }

    await prisma.$transaction(async (tx) => {
      for (const table of DELETE_ORDER) {
        await tx.$executeRawUnsafe(`DELETE FROM ${quoteIdentifier(table)}`);
      }

      for (const table of INSERT_ORDER) {
        const rows = Array.isArray(tables[table]) ? tables[table] : [];
        const columnTypes = columnTypesByTable.get(table);
        if (!columnTypes) {
          throw new ValidationError(`Aucune colonne autorisée trouvée pour la table ${table}`);
        }
        for (const row of rows) {
          if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw new ValidationError(`Ligne invalide dans la table ${table}`);
          }

          const entries = Object.entries(row);
          if (entries.length === 0) continue;

          for (const [key] of entries) {
            if (!columnTypes.has(key)) {
              throw new ValidationError(`Colonne non autorisée dans ${table}: ${key}`);
            }
          }

          // Le JSON ne conserve pas les types SQL (les Decimal deviennent des chaînes) :
          // chaque valeur est convertie explicitement vers le type de sa colonne.
          const columns = entries.map(([key]) => quoteIdentifier(key)).join(', ');
          const placeholders = entries
            .map(([key], index) => `$${index + 1}::${quoteIdentifier(columnTypes.get(key) as string)}`)
            .join(', ');
          const values = entries.map(([, value]) => value ?? null);

          await tx.$executeRawUnsafe(
            `INSERT INTO ${quoteIdentifier(table)} (${columns}) VALUES (${placeholders})`,
            ...values
          );
        }
      }
    });
  }
}
