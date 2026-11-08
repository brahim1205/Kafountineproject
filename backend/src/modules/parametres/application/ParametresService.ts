import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { BackupStore, BackupSummary, MunicipalTariff, ParametresRepository, Penalty, Permission } from '../domain/Parametres';

export type TariffInput = {
  categorie?: string;
  nom?: string;
  montant?: number;
  unite?: string;
  description?: string;
  actif?: boolean;
};

export type PenaltyInput = {
  type?: string;
  description?: string;
  montant?: number;
  delai?: string;
  actif?: boolean;
};

export type PermissionInput = {
  module?: string;
  role?: string;
  enabled?: boolean;
};

const ASSIGNABLE_PERMISSION_ROLES = ['AGENT', 'SUPERVISEUR', 'ADMIN', 'SUPER_ADMIN'];

export class ParametresService {
  constructor(
    private readonly repository: ParametresRepository,
    private readonly backups: BackupStore,
    private readonly auditTrail: AuditTrail
  ) {}

  async listTariffs() {
    const rows = await this.repository.listTariffs();
    return rows.map((row) => this.toTariffView(row));
  }

  async createTariff(actor: Actor, input: TariffInput) {
    const categorie = String(input.categorie || '').trim();
    const nom = String(input.nom || '').trim();
    const montant = Number(input.montant || 0);
    const unite = String(input.unite || '').trim();
    const actif = input.actif === undefined ? true : Boolean(input.actif);

    if (!categorie || !nom || !unite) {
      throw new ValidationError('La catégorie, le nom et l’unité sont requis.');
    }
    if (montant < 0) {
      throw new ValidationError('Le montant doit être positif.');
    }

    const category = await this.repository.findOrCreateTariffCategory(categorie);
    const itemId = await this.repository.createTariff({ categoryId: category.id, nom, montant, unite, actif });
    const row = (await this.repository.findTariff(itemId)) as MunicipalTariff;

    await this.auditTrail.record(actor, {
      action: 'Création tarif',
      module: 'Parametres',
      details: `Tarif ${row.nom} cree dans ${row.categorie}`,
    });

    return this.toTariffView(row);
  }

  async updateTariff(actor: Actor, id: string, input: TariffInput) {
    const existing = await this.repository.findTariff(id);
    if (!existing) {
      throw new NotFoundError('Tarif introuvable.');
    }

    const montant = input.montant === undefined ? existing.montant : Number(input.montant);
    if (montant < 0) {
      throw new ValidationError('Le montant doit être positif.');
    }

    const category = await this.repository.findOrCreateTariffCategory(
      input.categorie ? String(input.categorie).trim() : existing.categorie
    );
    await this.repository.updateTariff(
      id,
      {
        categoryId: category.id,
        nom: input.nom ? String(input.nom).trim() : existing.nom,
        montant,
        unite: input.unite ? String(input.unite).trim() : existing.unite,
        actif: input.actif === undefined ? existing.actif : Boolean(input.actif),
      },
      input.description === undefined ? existing.description : String(input.description || '').trim() || null
    );
    const row = (await this.repository.findTariff(id)) as MunicipalTariff;

    await this.auditTrail.record(actor, {
      action: 'Mise a jour tarif',
      module: 'Parametres',
      details: `Tarif ${row.nom} mis a jour`,
    });

    return this.toTariffView(row);
  }

  async deleteTariff(actor: Actor, id: string) {
    const existing = await this.repository.findTariff(id);
    if (!existing) {
      throw new NotFoundError('Tarif introuvable.');
    }

    await this.repository.deleteTariff(id);
    await this.auditTrail.record(actor, {
      action: 'Suppression tarif',
      module: 'Parametres',
      details: `Tarif ${existing.nom} supprime`,
      status: 'warning',
    });
  }

  async listPenalties() {
    const rows = await this.repository.listPenalties();
    return rows.map((row) => this.toPenaltyView(row));
  }

  async createPenalty(actor: Actor, input: PenaltyInput) {
    const type = String(input.type || '').trim();
    const montant = Number(input.montant || 0);
    const delai = String(input.delai || '').trim();

    if (!type || !delai) {
      throw new ValidationError('Le type et le délai sont requis.');
    }
    if (montant < 0) {
      throw new ValidationError('Le montant doit être positif.');
    }

    const row = await this.repository.createPenalty({
      type,
      description: input.description ? String(input.description).trim() : null,
      montant,
      delai,
      actif: input.actif === undefined ? true : Boolean(input.actif),
    });

    await this.auditTrail.record(actor, {
      action: 'Création pénalité',
      module: 'Paramètres',
      details: `Pénalité ${row.type} créée`,
    });

    return this.toPenaltyView(row);
  }

  async updatePenalty(actor: Actor, id: string, input: PenaltyInput) {
    const existing = await this.repository.findPenalty(id);
    if (!existing) {
      throw new NotFoundError('Pénalité introuvable.');
    }

    const montant = input.montant === undefined ? existing.montant : Number(input.montant);
    if (montant < 0) {
      throw new ValidationError('Le montant doit être positif.');
    }

    const row = await this.repository.updatePenalty(id, {
      type: input.type ? String(input.type).trim() : existing.type,
      description: input.description === undefined ? existing.description : String(input.description || '').trim() || null,
      montant,
      delai: input.delai ? String(input.delai).trim() : existing.delai,
      actif: input.actif === undefined ? existing.actif : Boolean(input.actif),
    });

    await this.auditTrail.record(actor, {
      action: 'Mise à jour pénalité',
      module: 'Paramètres',
      details: `Pénalité ${row.type} mise à jour`,
    });

    return this.toPenaltyView(row);
  }

  async deletePenalty(actor: Actor, id: string) {
    const existing = await this.repository.findPenalty(id);
    if (!existing) {
      throw new NotFoundError('Pénalité introuvable.');
    }

    await this.repository.deletePenalty(id);
    await this.auditTrail.record(actor, {
      action: 'Suppression pénalité',
      module: 'Paramètres',
      details: `Pénalité ${existing.type} supprimée`,
      status: 'warning',
    });
  }

  async listPermissions() {
    return this.groupPermissions(await this.repository.listPermissions());
  }

  async updatePermission(actor: Actor, input: PermissionInput) {
    const role = String(input.role || '').trim().toUpperCase();
    const moduleName = String(input.module || '').trim();
    const enabled = Boolean(input.enabled);

    if (!moduleName || !ASSIGNABLE_PERMISSION_ROLES.includes(role)) {
      throw new ValidationError('Le module et le rôle sont requis.');
    }

    await this.repository.upsertPermission(moduleName, role, enabled);

    await this.auditTrail.record(actor, {
      action: 'Mise à jour permission',
      module: 'Paramètres',
      details: `Permission ${role} / ${moduleName} définie à ${enabled ? 'activée' : 'désactivée'}`,
    });
  }

  async listBackups() {
    const rows = await this.backups.list();
    return rows.map((row) => this.toBackupView(row));
  }

  async createBackup(actor: Actor) {
    await this.repository.ensureDefaults();
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')}.json`;
    const row = await this.backups.create(filename);

    await this.auditTrail.record(actor, {
      action: 'Création sauvegarde',
      module: 'Backups',
      details: `Sauvegarde ${filename} créée`,
    });

    return this.toBackupView(row);
  }

  async restoreBackup(actor: Actor, filename: string) {
    if (!filename) {
      throw new ValidationError('Le nom du fichier de sauvegarde est requis.');
    }

    const backup = await this.backups.findByFilename(filename);
    if (!backup) {
      throw new NotFoundError('Sauvegarde introuvable.');
    }

    await this.backups.restore(backup);
    await this.auditTrail.record(actor, {
      action: 'Restauration sauvegarde',
      module: 'Backups',
      details: `Restauration effectuée depuis ${filename}`,
      status: 'warning',
    });
  }

  async getBackup(filename: string) {
    const backup = await this.backups.findByFilename(filename);
    if (!backup) {
      throw new NotFoundError('Sauvegarde introuvable.');
    }
    return backup;
  }

  private toTariffView(row: MunicipalTariff) {
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

  private toPenaltyView(row: Penalty) {
    return {
      id: row.id,
      type: row.type,
      description: row.description || undefined,
      montant: Number(row.montant || 0),
      delai: row.delai,
      actif: row.actif,
    };
  }

  private groupPermissions(rows: Permission[]) {
    const grouped = new Map<
      string,
      { module: string; agent: boolean; superviseur: boolean; admin: boolean }
    >();

    for (const row of rows) {
      const current = grouped.get(row.module) || {
        module: row.module,
        agent: false,
        superviseur: false,
        admin: false,
      };

      if (row.role === 'AGENT') current.agent = row.enabled;
      if (row.role === 'SUPERVISEUR') current.superviseur = row.enabled;
      if (row.role === 'ADMIN') current.admin = row.enabled;
      grouped.set(row.module, current);
    }

    return Array.from(grouped.values()).sort((a, b) => a.module.localeCompare(b.module, 'fr'));
  }

  private toBackupView(row: BackupSummary) {
    return {
      filename: row.filename,
      size: row.size,
      createdAt: row.createdAt.toISOString(),
      restoredAt: row.restoredAt ? row.restoredAt.toISOString() : null,
    };
  }
}
