import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { NumeroSequence } from '../../../shared/domain/NumeroSequence';
import type { ContribuableLookup } from '../../../shared/domain/ContribuableLookup';
import type { UrbanismeCase, UrbanismeRepository } from '../domain/Urbanisme';

export type UrbanismeInput = {
  contribuableId?: string;
  numero?: string;
  type?: string;
  description?: string;
  surface?: number | null;
  localisation?: string;
  nature?: string;
  montant?: number;
  statut?: string;
};

export type UrbanismeListFilters = {
  page: number;
  limit: number;
  year: number;
  statut: string;
  type: string;
};

const TYPE_CATALOG: Record<string, { id: string; nom: string; tarif: number; unite: string }> = {
  'permis-construire': { id: 'permis-construire', nom: 'Permis de construire', tarif: 5000, unite: 'm²' },
  'permis de construire': { id: 'permis-construire', nom: 'Permis de construire', tarif: 5000, unite: 'm²' },
  'autorisation-travaux': { id: 'autorisation-travaux', nom: 'Autorisation de travaux', tarif: 2500, unite: 'dossier' },
  'autorisation de travaux': { id: 'autorisation-travaux', nom: 'Autorisation de travaux', tarif: 2500, unite: 'dossier' },
  'certificat-conformite': { id: 'certificat-conformite', nom: 'Certificat de conformité', tarif: 2000, unite: 'dossier' },
  'certificat de conformité': { id: 'certificat-conformite', nom: 'Certificat de conformité', tarif: 2000, unite: 'dossier' },
  'titre-foncier': { id: 'titre-foncier', nom: 'Titre foncier', tarif: 10000, unite: 'dossier' },
  'titre foncier': { id: 'titre-foncier', nom: 'Titre foncier', tarif: 10000, unite: 'dossier' },
};

export function resolveUrbanismeType(type: string) {
  const normalized = type.trim().toLowerCase();
  return TYPE_CATALOG[normalized] || { id: normalized || 'dossier-urbanisme', nom: type.trim(), tarif: 2500, unite: 'dossier' };
}

export function normalizeUrbanismeStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'VALIDE' || normalized === 'REJETE' || normalized === 'EN_ATTENTE') {
    return normalized;
  }
  return 'EN_ATTENTE';
}

export class UrbanismeService {
  constructor(
    private readonly repository: UrbanismeRepository,
    private readonly contribuables: ContribuableLookup,
    private readonly auditTrail: AuditTrail,
    private readonly numeros: NumeroSequence
  ) {}

  async list(filters: UrbanismeListFilters) {
    const { page, limit, year, statut, type } = filters;
    const { rows, total } = await this.repository.search({
      year,
      statut: statut || null,
      type: type || null,
      offset: (page - 1) * limit,
      limit,
    });
    return { data: rows.map((row) => this.toView(row)), total };
  }

  async show(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundError("Dossier d'urbanisme introuvable.");
    }
    return this.toView(row);
  }

  async create(actor: Actor, input: UrbanismeInput) {
    const contribuableId = String(input.contribuableId || '').trim();
    const type = String(input.type || '').trim();

    if (!contribuableId || !type) {
      throw new ValidationError("Le contribuable et le type de dossier d'urbanisme sont requis.");
    }

    const contribuable = await this.contribuables.findById(contribuableId);
    if (!contribuable) {
      throw new NotFoundError('Contribuable introuvable.');
    }

    const urbanismeType = resolveUrbanismeType(type);
    const surface = input.surface === undefined || input.surface === null ? null : Number(input.surface);
    if (surface !== null && (Number.isNaN(surface) || surface < 0)) {
      throw new ValidationError("La surface du dossier d'urbanisme est invalide.");
    }

    const montant =
      input.montant === undefined
        ? urbanismeType.unite === 'm²'
          ? urbanismeType.tarif * Math.max(1, surface || 1)
          : urbanismeType.tarif
        : Number(input.montant);

    if (Number.isNaN(montant) || montant < 0) {
      throw new ValidationError("Le montant du dossier d'urbanisme est invalide.");
    }

    const year = new Date().getFullYear();
    const actorRole = String(actor.role || '').trim().toUpperCase();
    const defaultStatus = actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN' ? 'VALIDE' : 'EN_ATTENTE';
    const numero = input.numero
      ? String(input.numero).trim()
      : await this.numeros.next('urbanisme', year);

    const created = await this.repository.create(
      {
        numero,
        contribuableId: contribuable.id,
        agentId: actor.userId,
        type: urbanismeType.id,
        description: input.description ? String(input.description).trim() : null,
        surface,
        localisation: input.localisation ? String(input.localisation).trim() : null,
        nature: input.nature ? String(input.nature).trim() : null,
        montant,
        statut: input.statut ? normalizeUrbanismeStatus(String(input.statut)) : defaultStatus,
        year,
      },
      {
        contribuableNom: contribuable.nom,
        contribuablePrenom: contribuable.prenom,
        contribuableNin: contribuable.nin,
        contribuableTelephone: contribuable.telephone,
        contribuableAdresse: contribuable.adresse,
        agentNom: null,
        agentPrenom: null,
      }
    );

    await this.auditTrail.record(actor, {
      action: 'Création dossier urbanisme',
      module: 'Urbanisme',
      details: `Dossier ${created.numero} créé (${urbanismeType.nom})`,
    });

    return this.toView(created);
  }

  async update(actor: Actor, dossierId: string, input: UrbanismeInput) {
    const existing = await this.repository.findById(dossierId);
    if (!existing) {
      throw new NotFoundError("Dossier d'urbanisme introuvable.");
    }

    const nextSurface = input.surface === undefined ? existing.surface : input.surface === null ? null : Number(input.surface);
    if (nextSurface !== null && (Number.isNaN(nextSurface) || nextSurface < 0)) {
      throw new ValidationError("La surface du dossier d'urbanisme est invalide.");
    }

    const nextMontant = input.montant === undefined ? existing.montant : Number(input.montant);
    if (Number.isNaN(nextMontant) || nextMontant < 0) {
      throw new ValidationError("Le montant du dossier d'urbanisme est invalide.");
    }

    const updated = await this.repository.update(
      dossierId,
      {
        numero: input.numero ? String(input.numero).trim() : existing.numero,
        type: input.type ? resolveUrbanismeType(String(input.type)).id : existing.type,
        description: input.description === undefined ? existing.description : String(input.description || '').trim() || null,
        surface: nextSurface,
        localisation: input.localisation === undefined ? existing.localisation : String(input.localisation || '').trim() || null,
        nature: input.nature === undefined ? existing.nature : String(input.nature || '').trim() || null,
        montant: nextMontant,
        statut: input.statut ? normalizeUrbanismeStatus(String(input.statut)) : existing.statut,
      },
      existing
    );

    await this.auditTrail.record(actor, {
      action: 'Mise à jour dossier urbanisme',
      module: 'Urbanisme',
      details: `Dossier ${updated.numero} mis à jour (${updated.statut})`,
      status: updated.statut === 'REJETE' ? 'warning' : 'success',
    });

    return this.toView(updated);
  }

  async delete(actor: Actor, dossierId: string) {
    const existing = await this.repository.findById(dossierId);
    if (!existing) {
      throw new NotFoundError("Dossier d'urbanisme introuvable.");
    }
    await this.repository.delete(dossierId);
    await this.auditTrail.record(actor, {
      action: 'Suppression dossier urbanisme',
      module: 'Urbanisme',
      details: `Suppression du dossier ${existing.numero} (${existing.type})`,
      status: 'warning',
    });
  }

  async stats(year: number) {
    const dossiers = await this.repository.listForStats(year);
    const enAttente = dossiers.filter((item) => item.statut === 'EN_ATTENTE').length;
    const valide = dossiers.filter((item) => item.statut === 'VALIDE').length;
    const rejete = dossiers.filter((item) => item.statut === 'REJETE').length;
    const montantTotal = dossiers.reduce((sum, item) => sum + Number(item.montant || 0), 0);

    return {
      total: dossiers.length,
      enAttente,
      valide,
      rejete,
      montantTotal,
      totalDossiers: dossiers.length,
      dossiersEnAttente: enAttente,
      dossiersValides: valide,
      dossiersRejetes: rejete,
      recettes: montantTotal,
    };
  }

  private toView(row: UrbanismeCase) {
    return {
      id: row.id,
      numero: row.numero,
      contribuableId: row.contribuableId,
      type: row.type,
      description: row.description || undefined,
      surface: row.surface === null ? undefined : Number(row.surface),
      localisation: row.localisation || undefined,
      nature: row.nature || undefined,
      montant: Number(row.montant || 0),
      agent: row.agentPrenom && row.agentNom ? `${row.agentPrenom} ${row.agentNom}`.trim() : 'Agent Urbanisme',
      statut: row.statut,
      date: row.createdAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      contribuable: {
        id: row.contribuableId,
        nom: row.contribuableNom,
        prenom: row.contribuablePrenom,
        nin: row.contribuableNin,
        telephone: row.contribuableTelephone,
        adresse: row.contribuableAdresse,
      },
    };
  }
}
