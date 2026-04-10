import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';

type AppSettingTariffRow = {
  id: string;
  categorie: string;
  nom: string;
  montant: number;
  unite: string;
  description: string | null;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AppSettingPenaltyRow = {
  id: string;
  type: string;
  description: string | null;
  montant: number;
  delai: string;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AppSettingPermissionRow = {
  id: string;
  module: string;
  role: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BackupRecordRow = {
  id: string;
  filename: string;
  size: number;
  snapshot: string;
  restoredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PlaceholderSettingsService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async getTarifs() {
    const rows = await prisma.$queryRawUnsafe<AppSettingTariffRow[]>(
      'SELECT * FROM "AppSettingTariff" ORDER BY "categorie" ASC, "nom" ASC'
    );
    return rows.map((row) => this.mapTariffRow(row));
  }

  async createTarif(req: AuthRequest) {
    const payload = req.body || {};
    const categorie = String(payload.categorie || '').trim();
    const nom = String(payload.nom || '').trim();
    const montant = Number(payload.montant || 0);
    const unite = String(payload.unite || '').trim();
    const description = payload.description ? String(payload.description).trim() : null;
    const actif = payload.actif === undefined ? true : Boolean(payload.actif);

    if (!categorie || !nom || !unite) {
      throw new ValidationError('La catégorie, le nom et l’unité sont requis.');
    }
    if (montant < 0) {
      throw new ValidationError('Le montant doit être positif.');
    }

    const [row] = await prisma.$queryRawUnsafe<AppSettingTariffRow[]>(
      'INSERT INTO "AppSettingTariff" ("id", "categorie", "nom", "montant", "unite", "description", "actif", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      randomUUID(),
      categorie,
      nom,
      montant,
      unite,
      description,
      actif
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création tarif',
      module: 'Paramètres',
      details: `Tarif ${row.nom} créé dans ${row.categorie}`,
    });

    return this.mapTariffRow(row);
  }

  async updateTarif(req: AuthRequest) {
    const id = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<AppSettingTariffRow[]>(
      'SELECT * FROM "AppSettingTariff" WHERE "id" = $1 LIMIT 1',
      id
    );
    if (!existing) {
      throw new NotFoundError('Tarif introuvable.');
    }

    const payload = req.body || {};
    const montant = payload.montant === undefined ? existing.montant : Number(payload.montant);
    if (montant < 0) {
      throw new ValidationError('Le montant doit être positif.');
    }

    const [row] = await prisma.$queryRawUnsafe<AppSettingTariffRow[]>(
      'UPDATE "AppSettingTariff" SET "categorie" = $2, "nom" = $3, "montant" = $4, "unite" = $5, "description" = $6, "actif" = $7, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING *',
      id,
      payload.categorie ? String(payload.categorie).trim() : existing.categorie,
      payload.nom ? String(payload.nom).trim() : existing.nom,
      montant,
      payload.unite ? String(payload.unite).trim() : existing.unite,
      payload.description === undefined ? existing.description : String(payload.description || '').trim() || null,
      payload.actif === undefined ? existing.actif : Boolean(payload.actif)
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour tarif',
      module: 'Paramètres',
      details: `Tarif ${row.nom} mis à jour`,
    });

    return this.mapTariffRow(row);
  }

  async deleteTarif(req: AuthRequest) {
    const id = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<AppSettingTariffRow[]>(
      'SELECT * FROM "AppSettingTariff" WHERE "id" = $1 LIMIT 1',
      id
    );
    if (!existing) {
      throw new NotFoundError('Tarif introuvable.');
    }

    await prisma.$executeRaw`DELETE FROM "AppSettingTariff" WHERE "id" = ${id}`;
    await this.supportService.writeAuditLog(req, {
      action: 'Suppression tarif',
      module: 'Paramètres',
      details: `Tarif ${existing.nom} supprimé`,
      status: 'warning',
    });
  }

  async getPenalites() {
    const rows = await prisma.$queryRawUnsafe<AppSettingPenaltyRow[]>(
      'SELECT * FROM "AppSettingPenalty" ORDER BY "type" ASC'
    );
    return rows.map((row) => this.mapPenaltyRow(row));
  }

  async createPenalite(req: AuthRequest) {
    const payload = req.body || {};
    const type = String(payload.type || '').trim();
    const montant = Number(payload.montant || 0);
    const delai = String(payload.delai || '').trim();
    const description = payload.description ? String(payload.description).trim() : null;
    const actif = payload.actif === undefined ? true : Boolean(payload.actif);

    if (!type || !delai) {
      throw new ValidationError('Le type et le délai sont requis.');
    }
    if (montant < 0) {
      throw new ValidationError('Le montant doit être positif.');
    }

    const [row] = await prisma.$queryRawUnsafe<AppSettingPenaltyRow[]>(
      'INSERT INTO "AppSettingPenalty" ("id", "type", "description", "montant", "delai", "actif", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      randomUUID(),
      type,
      description,
      montant,
      delai,
      actif
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création pénalité',
      module: 'Paramètres',
      details: `Pénalité ${row.type} créée`,
    });

    return this.mapPenaltyRow(row);
  }

  async updatePenalite(req: AuthRequest) {
    const id = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<AppSettingPenaltyRow[]>(
      'SELECT * FROM "AppSettingPenalty" WHERE "id" = $1 LIMIT 1',
      id
    );
    if (!existing) {
      throw new NotFoundError('Pénalité introuvable.');
    }

    const payload = req.body || {};
    const montant = payload.montant === undefined ? existing.montant : Number(payload.montant);
    if (montant < 0) {
      throw new ValidationError('Le montant doit être positif.');
    }

    const [row] = await prisma.$queryRawUnsafe<AppSettingPenaltyRow[]>(
      'UPDATE "AppSettingPenalty" SET "type" = $2, "description" = $3, "montant" = $4, "delai" = $5, "actif" = $6, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING *',
      id,
      payload.type ? String(payload.type).trim() : existing.type,
      payload.description === undefined ? existing.description : String(payload.description || '').trim() || null,
      montant,
      payload.delai ? String(payload.delai).trim() : existing.delai,
      payload.actif === undefined ? existing.actif : Boolean(payload.actif)
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour pénalité',
      module: 'Paramètres',
      details: `Pénalité ${row.type} mise à jour`,
    });

    return this.mapPenaltyRow(row);
  }

  async deletePenalite(req: AuthRequest) {
    const id = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<AppSettingPenaltyRow[]>(
      'SELECT * FROM "AppSettingPenalty" WHERE "id" = $1 LIMIT 1',
      id
    );
    if (!existing) {
      throw new NotFoundError('Pénalité introuvable.');
    }

    await prisma.$executeRaw`DELETE FROM "AppSettingPenalty" WHERE "id" = ${id}`;
    await this.supportService.writeAuditLog(req, {
      action: 'Suppression pénalité',
      module: 'Paramètres',
      details: `Pénalité ${existing.type} supprimée`,
      status: 'warning',
    });
  }

  async getPermissions() {
    const rows = await prisma.$queryRawUnsafe<AppSettingPermissionRow[]>(
      'SELECT * FROM "AppSettingPermission" ORDER BY "module" ASC, "role" ASC'
    );
    return this.groupPermissionRows(rows);
  }

  async updatePermission(req: AuthRequest) {
    const payload = req.body || {};
    const role = String(payload.role || '').trim().toUpperCase();
    const moduleName = String(payload.module || '').trim();
    const enabled = Boolean(payload.enabled);
    const allowedRoles = ['AGENT', 'SUPERVISEUR', 'COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

    if (!moduleName || !allowedRoles.includes(role)) {
      throw new ValidationError('Le module et le rôle sont requis.');
    }

    const existing = await prisma.$queryRawUnsafe<AppSettingPermissionRow[]>(
      'SELECT * FROM "AppSettingPermission" WHERE "module" = $1 AND "role" = $2 LIMIT 1',
      moduleName,
      role
    );

    if (existing[0]) {
      await prisma.$executeRaw`
        UPDATE "AppSettingPermission"
        SET "enabled" = ${enabled}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "module" = ${moduleName} AND "role" = ${role}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "AppSettingPermission" ("id", "module", "role", "enabled", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${moduleName}, ${role}, ${enabled}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour permission',
      module: 'Paramètres',
      details: `Permission ${role} / ${moduleName} définie à ${enabled ? 'activée' : 'désactivée'}`,
    });
  }

  async settingsSeed(req: AuthRequest) {
    await this.supportService.ensureDefaultSettings();
    await this.supportService.writeAuditLog(req, {
      action: 'Initialisation paramètres',
      module: 'Paramètres',
      details: 'Chargement des tarifs, pénalités et permissions par défaut',
    });
  }

  async listBackups() {
    const rows = await prisma.$queryRawUnsafe<BackupRecordRow[]>(
      'SELECT * FROM "BackupRecord" ORDER BY "createdAt" DESC'
    );
    return rows.map((row) => this.mapBackupRow(row));
  }

  async createBackup(req: AuthRequest) {
    await this.supportService.ensureDefaultSettings();
    const snapshot = await this.supportService.buildBackupSnapshot();
    const snapshotText = JSON.stringify(snapshot);
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')}.json`;

    const [row] = await prisma.$queryRawUnsafe<BackupRecordRow[]>(
      'INSERT INTO "BackupRecord" ("id", "filename", "size", "snapshot", "restoredAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      randomUUID(),
      filename,
      Buffer.byteLength(snapshotText, 'utf8'),
      snapshotText
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création sauvegarde',
      module: 'Backups',
      details: `Sauvegarde ${filename} créée`,
    });

    return this.mapBackupRow(row);
  }

  async restoreBackup(req: AuthRequest) {
    const filename = String(req.body?.filename || '').trim();
    if (!filename) {
      throw new ValidationError('Le nom du fichier de sauvegarde est requis.');
    }

    const [backup] = await prisma.$queryRawUnsafe<BackupRecordRow[]>(
      'SELECT * FROM "BackupRecord" WHERE "filename" = $1 LIMIT 1',
      filename
    );
    if (!backup) {
      throw new NotFoundError('Sauvegarde introuvable.');
    }

    await this.supportService.restoreBackupSnapshot(backup.snapshot);
    await prisma.$executeRaw`
      UPDATE "BackupRecord"
      SET "restoredAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${backup.id}
    `;
    await this.supportService.writeAuditLog(req, {
      action: 'Restauration sauvegarde',
      module: 'Backups',
      details: `Restauration effectuée depuis ${filename}`,
      status: 'warning',
    });
  }

  async downloadBackup(filename: string) {
    const [backup] = await prisma.$queryRawUnsafe<BackupRecordRow[]>(
      'SELECT * FROM "BackupRecord" WHERE "filename" = $1 LIMIT 1',
      filename
    );
    if (!backup) {
      throw new NotFoundError('Sauvegarde introuvable.');
    }

    return backup;
  }

  private mapTariffRow(row: AppSettingTariffRow) {
    return {
      id: row.id,
      categorie: row.categorie,
      nom: row.nom,
      montant: Number(row.montant || 0),
      unite: row.unite,
      description: row.description || undefined,
      actif: row.actif,
    };
  }

  private mapPenaltyRow(row: AppSettingPenaltyRow) {
    return {
      id: row.id,
      type: row.type,
      description: row.description || undefined,
      montant: Number(row.montant || 0),
      delai: row.delai,
      actif: row.actif,
    };
  }

  private groupPermissionRows(rows: AppSettingPermissionRow[]) {
    const grouped = new Map<
      string,
      { module: string; agent: boolean; superviseur: boolean; comptable: boolean; admin: boolean }
    >();

    for (const row of rows) {
      const current = grouped.get(row.module) || {
        module: row.module,
        agent: false,
        superviseur: false,
        comptable: false,
        admin: false,
      };

      if (row.role === 'AGENT') current.agent = row.enabled;
      if (row.role === 'SUPERVISEUR') current.superviseur = row.enabled;
      if (row.role === 'COMPTABLE') current.comptable = row.enabled;
      if (row.role === 'ADMIN') current.admin = row.enabled;
      grouped.set(row.module, current);
    }

    return Array.from(grouped.values()).sort((a, b) => a.module.localeCompare(b.module, 'fr'));
  }

  private mapBackupRow(row: BackupRecordRow) {
    return {
      filename: row.filename,
      size: row.size,
      createdAt: row.createdAt.toISOString(),
      restoredAt: row.restoredAt ? row.restoredAt.toISOString() : null,
    };
  }
}
