import { randomUUID } from 'node:crypto';
import { db } from '../../../shared/infrastructure/prisma/transactionContext';
import type { AppNotification, NotificationRepository } from '../domain/Notification';

function isMissingRelationError(error: unknown, relationName: string) {
  return error instanceof Error && error.message.includes(`relation "${relationName}" does not exist`);
}

export class PrismaNotificationRepository implements NotificationRepository {
  async ensureSeed(year: number) {
    let count: { count: bigint } | undefined;
    try {
      [count] = await db().$queryRawUnsafe<Array<{ count: bigint }>>(
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

    await db().$executeRaw`
      INSERT INTO "AppNotification" ("id","userId","type","titre","message","montant","contribuable","agent","lu","readAt","year","createdAt","updatedAt")
      VALUES
      (${randomUUID()}, ${null}, ${'alerte'}, ${'Suivi recouvrement'}, ${'Vérifier les transactions en attente du mois courant.'}, ${null}, ${null}, ${null}, ${false}, ${null}, ${year}, ${new Date()}, ${new Date()}),
      (${randomUUID()}, ${null}, ${'info'}, ${'Sauvegarde recommandée'}, ${'Planifier une sauvegarde applicative avant le prochain déploiement.'}, ${null}, ${null}, ${null}, ${false}, ${null}, ${year}, ${new Date()}, ${new Date()}),
      (${randomUUID()}, ${null}, ${'succes'}, ${'Année active'}, ${`L’année ${year} est disponible pour la saisie et la consultation.`}, ${null}, ${null}, ${null}, ${false}, ${null}, ${year}, ${new Date()}, ${new Date()})
    `;
  }

  async list(year: number, limit: number) {
    try {
      return await db().$queryRawUnsafe<AppNotification[]>(
        'SELECT * FROM "AppNotification" WHERE "year" = $1 ORDER BY "createdAt" DESC LIMIT $2',
        year,
        limit
      );
    } catch (error) {
      if (isMissingRelationError(error, 'AppNotification')) {
        return [];
      }
      throw error;
    }
  }

  async markRead(id: string) {
    const count = await db().$executeRaw`
      UPDATE "AppNotification"
      SET "lu" = true, "readAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;
    return count > 0;
  }

  async markAllRead(year: number) {
    await db().$executeRaw`
      UPDATE "AppNotification"
      SET "lu" = true, "readAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "year" = ${year} AND "lu" = false
    `;
  }

  async listActiveYears() {
    try {
      const rows = await db().$queryRawUnsafe<Array<{ year: number }>>(
        `
          SELECT DISTINCT "year"::int AS "year" FROM "Transaction"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "BudgetLine"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "BudgetRequest"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "AuditLog"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "EtatCivilRequest"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "UrbanismeCase"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "MarketPlace"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "MotoRegistration"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "TrainingProgram"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "Fisherman"
          UNION SELECT DISTINCT "year"::int AS "year" FROM "AppNotification"
          ORDER BY "year" DESC
        `
      );
      return rows.map((row) => row.year);
    } catch (error) {
      if (!isMissingRelationError(error, 'AppNotification')) {
        throw error;
      }
      return [];
    }
  }
}
