import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { BudgetRepository } from '../domain/Budget';

export type BudgetLineInput = {
  code?: string;
  libelle?: string;
  description?: string;
  prevu?: number;
  depense?: number;
  year?: number;
};

export type BudgetRequestInput = {
  service?: string;
  description?: string;
  montant?: number;
  statut?: string;
  motif?: string;
  year?: number;
};

export class BudgetService {
  constructor(
    private readonly repository: BudgetRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  listLines(year: number) {
    return this.repository.listLines(year);
  }

  async createLine(actor: Actor, input: BudgetLineInput) {
    const code = String(input.code || '').trim().toUpperCase();
    const libelle = String(input.libelle || '').trim();
    const description = input.description ? String(input.description).trim() : null;
    const prevu = Number(input.prevu || 0);
    const depense = Number(input.depense || 0);
    const year = input.year ? Number(input.year) : new Date().getFullYear();

    if (!code || !libelle) {
      throw new ValidationError('Le code et le libellé sont requis.');
    }

    if (prevu < 0 || depense < 0) {
      throw new ValidationError('Les montants budgétaires doivent être positifs.');
    }

    if (await this.repository.findLineByCode(code, year)) {
      throw new ConflictError('Une ligne budgétaire avec ce code existe déjà pour cette année.');
    }

    const line = await this.repository.createLine({ code, libelle, description, prevu, depense, year });

    await this.auditTrail.record(actor, {
      action: 'Création ligne budgétaire',
      module: 'Budget',
      details: `Création de la ligne ${line.code} - ${line.libelle} (${line.year})`,
    });

    return line;
  }

  async updateLine(actor: Actor, lineId: string, input: BudgetLineInput) {
    const existing = await this.repository.findLineById(lineId);
    if (!existing) {
      throw new NotFoundError('Ligne budgétaire introuvable.');
    }

    const nextCode = input.code ? String(input.code).trim().toUpperCase() : existing.code;
    const nextYear = input.year ? Number(input.year) : existing.year;

    if (nextCode !== existing.code || nextYear !== existing.year) {
      const duplicate = await this.repository.findLineByCode(nextCode, nextYear);
      if (duplicate && duplicate.id !== existing.id) {
        throw new ConflictError('Une ligne budgétaire avec ce code existe déjà pour cette année.');
      }
    }

    const prevu = input.prevu === undefined ? existing.prevu : Number(input.prevu);
    const depense = input.depense === undefined ? existing.depense : Number(input.depense);

    if (prevu < 0 || depense < 0) {
      throw new ValidationError('Les montants budgétaires doivent être positifs.');
    }

    const line = await this.repository.updateLine(lineId, {
      code: nextCode,
      libelle: input.libelle ? String(input.libelle).trim() : existing.libelle,
      description: input.description === undefined ? existing.description : String(input.description || '').trim() || null,
      prevu,
      depense,
      year: nextYear,
    });

    await this.auditTrail.record(actor, {
      action: 'Mise à jour ligne budgétaire',
      module: 'Budget',
      details: `Mise à jour de la ligne ${line.code} - ${line.libelle} (${line.year})`,
    });

    return line;
  }

  async deleteLine(actor: Actor, lineId: string) {
    const existing = await this.repository.findLineById(lineId);
    if (!existing) {
      throw new NotFoundError('Ligne budgétaire introuvable.');
    }
    await this.repository.deleteLine(lineId);
    await this.auditTrail.record(actor, {
      action: 'Suppression ligne budgétaire',
      module: 'Budget',
      details: `Suppression de la ligne ${existing.code} - ${existing.libelle} (${existing.year})`,
    });
  }

  async getStats(year: number) {
    const [lines, requests] = await Promise.all([
      this.repository.listLines(year),
      this.repository.listRequests(year),
    ]);

    const totalPrevu = lines.reduce((sum, item) => sum + Number(item.prevu || 0), 0);
    const totalDepense = lines.reduce((sum, item) => sum + Number(item.depense || 0), 0);
    const countByStatus = new Map<string, number>();
    for (const item of requests) {
      countByStatus.set(item.statut, (countByStatus.get(item.statut) || 0) + 1);
    }

    return {
      totalPrevu,
      totalDepense,
      totalReste: totalPrevu - totalDepense,
      tauxExecution: totalPrevu > 0 ? Math.round((totalDepense / totalPrevu) * 100) : 0,
      nombreLignes: lines.length,
      demandesEnAttente: countByStatus.get('EN_ATTENTE') || 0,
      demandesApprouvees: countByStatus.get('APPROUVE') || 0,
      demandesRejetees: countByStatus.get('REJETE') || 0,
    };
  }

  listRequests(year: number) {
    return this.repository.listRequests(year);
  }

  async createRequest(actor: Actor, input: BudgetRequestInput) {
    const service = String(input.service || '').trim();
    const description = String(input.description || '').trim();
    const montant = Number(input.montant || 0);
    const year = input.year ? Number(input.year) : new Date().getFullYear();

    if (!service || !description) {
      throw new ValidationError('Le service et la description sont requis.');
    }

    if (montant <= 0) {
      throw new ValidationError('Le montant demandé doit être supérieur à zéro.');
    }

    const request = await this.repository.createRequest({
      service,
      description,
      montant,
      statut: 'EN_ATTENTE',
      motif: null,
      year,
      requestedById: actor.userId,
      approvedById: null,
    });

    await this.auditTrail.record(actor, {
      action: 'Création demande budgétaire',
      module: 'Budget',
      details: `Demande ${request.id} créée pour ${service} (${montant} FCFA)`,
    });

    return request;
  }

  async updateRequest(actor: Actor, requestId: string, input: BudgetRequestInput) {
    const existing = await this.repository.findRequestById(requestId);
    if (!existing) {
      throw new NotFoundError('Demande budgétaire introuvable.');
    }

    const montant = input.montant === undefined ? existing.montant : Number(input.montant);
    if (montant <= 0) {
      throw new ValidationError('Le montant demandé doit être supérieur à zéro.');
    }

    const nextStatut = input.statut ? String(input.statut).trim().toUpperCase() : existing.statut;
    const approvedById =
      nextStatut === 'APPROUVE' || nextStatut === 'REJETE'
        ? actor.userId || existing.approvedById
        : existing.approvedById;

    const request = await this.repository.updateRequest(requestId, {
      service: input.service ? String(input.service).trim() : existing.service,
      description: input.description ? String(input.description).trim() : existing.description,
      montant,
      statut: nextStatut,
      motif: input.motif === undefined ? existing.motif : String(input.motif || '').trim() || null,
      approvedById,
    });

    await this.auditTrail.record(actor, {
      action: 'Mise à jour demande budgétaire',
      module: 'Budget',
      details: `Demande ${request.id} mise à jour (${request.statut})`,
    });

    return request;
  }
}
