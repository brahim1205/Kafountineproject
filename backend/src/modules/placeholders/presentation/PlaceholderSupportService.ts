import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { ValidationError } from '../../../shared/errors/AppError';

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

const SQL_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quoteIdentifier(identifier: string) {
  if (!SQL_IDENTIFIER_REGEX.test(identifier)) {
    throw new ValidationError(`Identifiant SQL invalide: ${identifier}`);
  }

  return `"${identifier}"`;
}

function isMissingRelationError(error: unknown, relationName: string) {
  return error instanceof Error && error.message.includes(`relation "${relationName}" does not exist`);
}

export class PlaceholderSupportService {
  async ensureDefaultSettings() {
    const [tariffCount, penaltyCount, permissionCount] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingTariff"'),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingPenalty"'),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingPermission"'),
    ]);

    if (Number(tariffCount[0]?.count || 0) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "AppSettingTariff" ("id", "categorie", "nom", "montant", "unite", "description", "actif", "createdAt", "updatedAt")
        VALUES
        (${randomUUID()}, ${'État Civil'}, ${'Extrait de naissance'}, ${1000}, ${'FCFA'}, ${'Délivrance standard d’un extrait'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Urbanisme'}, ${'Permis de construire'}, ${600000}, ${'FCFA'}, ${'Instruction complète du permis'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Marché'}, ${'Occupation place mensuelle'}, ${5000}, ${'FCFA/mois'}, ${'Place standard marché central'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Transport'}, ${'Licence moto-taxi'}, ${1000}, ${'FCFA/mois'}, ${'Paiement mensuel moto-taxi'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    if (Number(penaltyCount[0]?.count || 0) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "AppSettingPenalty" ("id", "type", "description", "montant", "delai", "actif", "createdAt", "updatedAt")
        VALUES
        (${randomUUID()}, ${'Retard paiement marché'}, ${'Majoration appliquée après échéance mensuelle'}, ${1500}, ${'5 jours après échéance'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Retard dossier urbanisme'}, ${'Frais complémentaires en cas de dossier incomplet prolongé'}, ${5000}, ${'10 jours après notification'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (${randomUUID()}, ${'Retard moto-taxi'}, ${'Pénalité standard de régularisation'}, ${250}, ${'Immédiatement après échéance'}, ${true}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    if (Number(permissionCount[0]?.count || 0) === 0) {
      const modules = [
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
      const roles = ['AGENT', 'SUPERVISEUR', 'COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];
      for (const moduleName of modules) {
        for (const role of roles) {
          const enabled =
            role === 'SUPER_ADMIN'
              ? true
              : role === 'ADMIN'
                ? true
                : role === 'COMPTABLE'
                  ? ['Dashboard', 'Contribuables', 'Recettes', 'Taxes', 'Budget', 'Marché'].includes(moduleName)
                  : role === 'SUPERVISEUR'
                    ? ['Dashboard', 'Contribuables', 'Recettes', 'Taxes', 'État civil', 'Urbanisme'].includes(moduleName)
                    : ['Dashboard', 'Contribuables', 'Recettes', 'Taxes', 'État civil', 'Urbanisme', 'Marché', 'Motos', 'Formations', 'Quai de pêche'].includes(moduleName);

          await prisma.$executeRaw`
            INSERT INTO "AppSettingPermission" ("id", "module", "role", "enabled", "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${moduleName}, ${role}, ${enabled}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
        }
      }
    }
  }

  async ensureNotificationSeed(year: number) {
    let count: { count: bigint } | undefined;
    try {
      [count] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        'SELECT COUNT(*)::bigint AS count FROM "AppNotification" WHERE "year" = $1',
        year
      );
    } catch (error) {
      if (isMissingRelationError(error, 'AppNotification')) {
        return;
      }
      throw error;
    }

    if (Number(count?.count || 0) > 0) {
      return;
    }

    await prisma.$executeRaw`
      INSERT INTO "AppNotification" ("id","userId","type","titre","message","montant","contribuable","agent","lu","readAt","year","createdAt","updatedAt")
      VALUES
      (${randomUUID()}, ${null}, ${'alerte'}, ${'Suivi recouvrement'}, ${'Vérifier les transactions en attente du mois courant.'}, ${null}, ${null}, ${null}, ${false}, ${null}, ${year}, ${new Date()}, ${new Date()}),
      (${randomUUID()}, ${null}, ${'info'}, ${'Sauvegarde recommandée'}, ${'Planifier une sauvegarde applicative avant le prochain déploiement.'}, ${null}, ${null}, ${null}, ${false}, ${null}, ${year}, ${new Date()}, ${new Date()}),
      (${randomUUID()}, ${null}, ${'succes'}, ${'Année active'}, ${`L’année ${year} est disponible pour la saisie et la consultation.`}, ${null}, ${null}, ${null}, ${false}, ${null}, ${year}, ${new Date()}, ${new Date()})
    `;
  }

  async buildBackupSnapshot() {
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

  async restoreBackupSnapshot(snapshotText: string) {
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

    const dbColumns = await prisma.$queryRawUnsafe<Array<{ tableName: string; columnName: string }>>(
      `SELECT "table_name" AS "tableName", "column_name" AS "columnName"
       FROM "information_schema"."columns"
       WHERE "table_schema" = 'public'`
    );
    const allowedColumnsByTable = new Map<string, Set<string>>();
    for (const row of dbColumns) {
      if (!allowedTableNames.has(row.tableName)) {
        continue;
      }
      const columns = allowedColumnsByTable.get(row.tableName) || new Set<string>();
      columns.add(row.columnName);
      allowedColumnsByTable.set(row.tableName, columns);
    }

    const deleteOrder = [
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

    const insertOrder = [
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

    await prisma.$transaction(async (tx) => {
      for (const table of deleteOrder) {
        await tx.$executeRawUnsafe(`DELETE FROM ${quoteIdentifier(table)}`);
      }

      const insertRows = async (table: string) => {
        const rows = Array.isArray(tables[table]) ? tables[table] : [];
        const allowedColumns = allowedColumnsByTable.get(table);
        if (!allowedColumns) {
          throw new ValidationError(`Aucune colonne autorisée trouvée pour la table ${table}`);
        }
        for (const row of rows) {
          if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw new ValidationError(`Ligne invalide dans la table ${table}`);
          }

          const entries = Object.entries(row);
          if (entries.length === 0) continue;

          for (const [key] of entries) {
            if (!allowedColumns.has(key)) {
              throw new ValidationError(`Colonne non autorisée dans ${table}: ${key}`);
            }
          }

          const columns = entries.map(([key]) => quoteIdentifier(key)).join(', ');
          const placeholders = entries.map((_, index) => `$${index + 1}`).join(', ');
          const values = entries.map(([, value]) => value);

          await tx.$executeRawUnsafe(
            `INSERT INTO ${quoteIdentifier(table)} (${columns}) VALUES (${placeholders})`,
            ...values
          );
        }
      };

      for (const table of insertOrder) {
        await insertRows(table);
      }
    });
  }

  async writeAuditLog(
    req: AuthRequest,
    input: { action: string; module: string; details: string; status?: 'success' | 'warning' | 'error' }
  ) {
    const actorId = req.user?.userId;
    const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : null;
    const ipAddressHeader = req.headers['x-forwarded-for'];
    const ipAddress = Array.isArray(ipAddressHeader)
      ? ipAddressHeader[0]
      : typeof ipAddressHeader === 'string'
        ? ipAddressHeader.split(',')[0]?.trim()
        : req.ip || null;

    await prisma.$executeRaw`
      INSERT INTO "AuditLog" ("id", "userId", "userName", "role", "action", "module", "details", "status", "ipAddress", "year", "timestamp")
      VALUES (${randomUUID()}, ${actor?.id || null}, ${actor ? `${actor.prenom} ${actor.nom}`.trim() : 'Système'}, ${actor?.role || req.user?.role || 'SYSTEME'}, ${input.action}, ${input.module}, ${input.details}, ${input.status || 'success'}, ${ipAddress}, ${new Date().getFullYear()}, CURRENT_TIMESTAMP)
    `;
  }
}
