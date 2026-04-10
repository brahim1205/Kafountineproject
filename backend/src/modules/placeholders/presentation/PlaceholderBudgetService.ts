import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';

type BudgetLineRow = {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
};

type BudgetRequestRow = {
  id: string;
  service: string;
  description: string;
  montant: number;
  statut: string;
  motif: string | null;
  year: number;
  requestedById: string | null;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PlaceholderBudgetService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async listBudgetLignes(year: number) {
    return prisma.$queryRawUnsafe<BudgetLineRow[]>(
      'SELECT * FROM "BudgetLine" WHERE "year" = $1 ORDER BY "code" ASC, "libelle" ASC',
      year
    );
  }

  async createBudgetLigne(req: AuthRequest) {
    const payload = req.body || {};
    const code = String(payload.code || '').trim().toUpperCase();
    const libelle = String(payload.libelle || '').trim();
    const description = payload.description ? String(payload.description).trim() : null;
    const prevu = Number(payload.prevu || 0);
    const depense = Number(payload.depense || 0);
    const year = payload.year ? Number(payload.year) : new Date().getFullYear();

    if (!code || !libelle) {
      throw new ValidationError('Le code et le libellé sont requis.');
    }

    if (prevu < 0 || depense < 0) {
      throw new ValidationError('Les montants budgétaires doivent être positifs.');
    }

    const duplicate = await prisma.$queryRawUnsafe<BudgetLineRow[]>(
      'SELECT * FROM "BudgetLine" WHERE "code" = $1 AND "year" = $2 LIMIT 1',
      code,
      year
    );
    if (duplicate.length > 0) {
      throw new ConflictError('Une ligne budgétaire avec ce code existe déjà pour cette année.');
    }

    const [line] = await prisma.$queryRawUnsafe<BudgetLineRow[]>(
      'INSERT INTO "BudgetLine" ("id", "code", "libelle", "description", "prevu", "depense", "year", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      randomUUID(),
      code,
      libelle,
      description,
      prevu,
      depense,
      year
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création ligne budgétaire',
      module: 'Budget',
      details: `Création de la ligne ${line.code} - ${line.libelle} (${line.year})`,
    });

    return line;
  }

  async updateBudgetLigne(req: AuthRequest) {
    const lineId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<BudgetLineRow[]>(
      'SELECT * FROM "BudgetLine" WHERE "id" = $1 LIMIT 1',
      lineId
    );
    if (!existing) {
      throw new NotFoundError('Ligne budgétaire introuvable.');
    }

    const payload = req.body || {};
    const nextCode = payload.code ? String(payload.code).trim().toUpperCase() : existing.code;
    const nextYear = payload.year ? Number(payload.year) : existing.year;

    if (nextCode !== existing.code || nextYear !== existing.year) {
      const [duplicate] = await prisma.$queryRawUnsafe<BudgetLineRow[]>(
        'SELECT * FROM "BudgetLine" WHERE "code" = $1 AND "year" = $2 LIMIT 1',
        nextCode,
        nextYear
      );
      if (duplicate && duplicate.id !== existing.id) {
        throw new ConflictError('Une ligne budgétaire avec ce code existe déjà pour cette année.');
      }
    }

    const prevu = payload.prevu === undefined ? existing.prevu : Number(payload.prevu);
    const depense = payload.depense === undefined ? existing.depense : Number(payload.depense);

    if (prevu < 0 || depense < 0) {
      throw new ValidationError('Les montants budgétaires doivent être positifs.');
    }

    const [line] = await prisma.$queryRawUnsafe<BudgetLineRow[]>(
      'UPDATE "BudgetLine" SET "code" = $2, "libelle" = $3, "description" = $4, "prevu" = $5, "depense" = $6, "year" = $7, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING *',
      lineId,
      nextCode,
      payload.libelle ? String(payload.libelle).trim() : existing.libelle,
      payload.description === undefined ? existing.description : String(payload.description || '').trim() || null,
      prevu,
      depense,
      nextYear
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour ligne budgétaire',
      module: 'Budget',
      details: `Mise à jour de la ligne ${line.code} - ${line.libelle} (${line.year})`,
    });

    return line;
  }

  async deleteBudgetLigne(req: AuthRequest) {
    const lineId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<BudgetLineRow[]>(
      'SELECT * FROM "BudgetLine" WHERE "id" = $1 LIMIT 1',
      lineId
    );
    if (!existing) {
      throw new NotFoundError('Ligne budgétaire introuvable.');
    }
    await prisma.$executeRaw`DELETE FROM "BudgetLine" WHERE "id" = ${lineId}`;
    await this.supportService.writeAuditLog(req, {
      action: 'Suppression ligne budgétaire',
      module: 'Budget',
      details: `Suppression de la ligne ${existing.code} - ${existing.libelle} (${existing.year})`,
    });
  }

  async getBudgetStats(year: number) {
    const [aggregate, demandes] = await Promise.all([
      prisma.$queryRawUnsafe<BudgetLineRow[]>('SELECT * FROM "BudgetLine" WHERE "year" = $1', year),
      prisma.$queryRawUnsafe<BudgetRequestRow[]>('SELECT * FROM "BudgetRequest" WHERE "year" = $1', year),
    ]);

    const totalPrevu = aggregate.reduce((sum, item) => sum + Number(item.prevu || 0), 0);
    const totalDepense = aggregate.reduce((sum, item) => sum + Number(item.depense || 0), 0);
    const countByStatus = new Map<string, number>();
    for (const item of demandes) {
      countByStatus.set(item.statut, (countByStatus.get(item.statut) || 0) + 1);
    }

    return {
      totalPrevu,
      totalDepense,
      totalReste: totalPrevu - totalDepense,
      tauxExecution: totalPrevu > 0 ? Math.round((totalDepense / totalPrevu) * 100) : 0,
      nombreLignes: aggregate.length,
      demandesEnAttente: countByStatus.get('EN_ATTENTE') || 0,
      demandesApprouvees: countByStatus.get('APPROUVE') || 0,
      demandesRejetees: countByStatus.get('REJETE') || 0,
    };
  }

  async listBudgetDemandes(year: number) {
    return prisma.$queryRawUnsafe<BudgetRequestRow[]>(
      'SELECT * FROM "BudgetRequest" WHERE "year" = $1 ORDER BY "createdAt" DESC',
      year
    );
  }

  async createBudgetDemande(req: AuthRequest) {
    const payload = req.body || {};
    const service = String(payload.service || '').trim();
    const description = String(payload.description || '').trim();
    const montant = Number(payload.montant || 0);
    const year = payload.year ? Number(payload.year) : new Date().getFullYear();

    if (!service || !description) {
      throw new ValidationError('Le service et la description sont requis.');
    }

    if (montant <= 0) {
      throw new ValidationError('Le montant demandé doit être supérieur à zéro.');
    }

    const [demande] = await prisma.$queryRawUnsafe<BudgetRequestRow[]>(
      'INSERT INTO "BudgetRequest" ("id", "service", "description", "montant", "statut", "motif", "year", "requestedById", "approvedById", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      randomUUID(),
      service,
      description,
      montant,
      'EN_ATTENTE',
      null,
      year,
      req.user?.userId || null,
      null
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création demande budgétaire',
      module: 'Budget',
      details: `Demande ${demande.id} créée pour ${service} (${montant} FCFA)`,
    });

    return demande;
  }

  async updateBudgetDemande(req: AuthRequest) {
    const demandeId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<BudgetRequestRow[]>(
      'SELECT * FROM "BudgetRequest" WHERE "id" = $1 LIMIT 1',
      demandeId
    );
    if (!existing) {
      throw new NotFoundError('Demande budgétaire introuvable.');
    }

    const payload = req.body || {};
    const montant = payload.montant === undefined ? existing.montant : Number(payload.montant);
    if (montant <= 0) {
      throw new ValidationError('Le montant demandé doit être supérieur à zéro.');
    }

    const nextStatut = payload.statut ? String(payload.statut).trim().toUpperCase() : existing.statut;
    const approvedById =
      nextStatut === 'APPROUVE' || nextStatut === 'REJETE'
        ? req.user?.userId || existing.approvedById
        : existing.approvedById;

    const [demande] = await prisma.$queryRawUnsafe<BudgetRequestRow[]>(
      'UPDATE "BudgetRequest" SET "service" = $2, "description" = $3, "montant" = $4, "statut" = $5, "motif" = $6, "approvedById" = $7, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING *',
      demandeId,
      payload.service ? String(payload.service).trim() : existing.service,
      payload.description ? String(payload.description).trim() : existing.description,
      montant,
      nextStatut,
      payload.motif === undefined ? existing.motif : String(payload.motif || '').trim() || null,
      approvedById
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour demande budgétaire',
      module: 'Budget',
      details: `Demande ${demande.id} mise à jour (${demande.statut})`,
    });

    return demande;
  }
}
