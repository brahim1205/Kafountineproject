import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { NotFoundError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';

type AppNotificationRow = {
  id: string;
  userId: string | null;
  type: string;
  titre: string;
  message: string;
  montant: number | null;
  contribuable: string | null;
  agent: string | null;
  lu: boolean;
  readAt: Date | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
};

function isMissingRelationError(error: unknown, relationName: string) {
  return error instanceof Error && error.message.includes(`relation "${relationName}" does not exist`);
}

export class PlaceholderNotificationsService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async listNotifications(year: number, limit: number) {
    try {
      await this.supportService.ensureNotificationSeed(year);
      const rows = await prisma.$queryRawUnsafe<AppNotificationRow[]>(
        'SELECT * FROM "AppNotification" WHERE "year" = $1 ORDER BY "createdAt" DESC LIMIT $2',
        year,
        limit
      );
      return rows.map((row) => this.mapNotificationRow(row));
    } catch (error) {
      if (isMissingRelationError(error, 'AppNotification')) {
        return [];
      }
      throw error;
    }
  }

  async markRead(id: string) {
    const count = await prisma.$executeRaw`
      UPDATE "AppNotification"
      SET "lu" = true, "readAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;
    if (count === 0) {
      throw new NotFoundError('Notification introuvable.');
    }
  }

  async markAllRead(year: number) {
    await prisma.$executeRaw`
      UPDATE "AppNotification"
      SET "lu" = true, "readAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "year" = ${year} AND "lu" = false
    `;
  }

  async listYears() {
    let rows: Array<{ year: number }> = [];
    try {
      rows = await prisma.$queryRawUnsafe<Array<{ year: number }>>(
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
    } catch (error) {
      if (!isMissingRelationError(error, 'AppNotification')) {
        throw error;
      }
    }

    const currentYear = new Date().getFullYear();
    const normalized = rows.length > 0 ? rows.map((row) => row.year) : [currentYear];
    return normalized.map((year) => ({ annee: year, estActive: year === currentYear }));
  }

  getCurrentYear() {
    const current = new Date().getFullYear();
    return { annee: current, estActive: true };
  }

  async autoCreateYear(req: AuthRequest) {
    const current = new Date().getFullYear();
    await this.supportService.ensureNotificationSeed(current);
    await this.supportService.writeAuditLog(req, {
      action: 'Disponibilisation année',
      module: 'Paramètres',
      details: `Année ${current} rendue disponible dans l’application`,
    });
    return { annee: current, estActive: true };
  }

  private mapNotificationRow(row: AppNotificationRow) {
    return {
      id: row.id,
      userId: row.userId || 'system',
      type: row.type,
      titre: row.titre,
      message: row.message,
      montant: row.montant === null ? null : Number(row.montant),
      contribuable: row.contribuable,
      agent: row.agent,
      lu: row.lu,
      timestamp: row.createdAt.toISOString(),
    };
  }
}
