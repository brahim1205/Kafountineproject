import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { ContribuableLookup } from '../../../shared/domain/ContribuableLookup';
import type { EtatCivilDisplay, EtatCivilRepository, EtatCivilRequest } from '../domain/EtatCivil';

export type EtatCivilInput = {
  contribuableId?: string;
  typeDocument?: string;
  exemplaires?: number;
  montant?: number;
  statut?: string;
  observations?: string;
};

const DOCUMENT_CATALOG: Record<string, { id: string; nom: string; tarif: number }> = {
  'extrait-naissance': { id: 'extrait-naissance', nom: 'Extrait de naissance', tarif: 500 },
  'extrait de naissance': { id: 'extrait-naissance', nom: 'Extrait de naissance', tarif: 500 },
  'certificat-residence': { id: 'certificat-residence', nom: 'Certificat de résidence', tarif: 1000 },
  'certificat de résidence': { id: 'certificat-residence', nom: 'Certificat de résidence', tarif: 1000 },
  'legalisation-signature': { id: 'legalisation-signature', nom: 'Légalisation de signature', tarif: 1000 },
  'légalisation de signature': { id: 'legalisation-signature', nom: 'Légalisation de signature', tarif: 1000 },
  'certificat-vie': { id: 'certificat-vie', nom: 'Certificat de vie', tarif: 500 },
  'certificat de vie': { id: 'certificat-vie', nom: 'Certificat de vie', tarif: 500 },
  'certificat-celibat': { id: 'certificat-celibat', nom: 'Certificat de célibat', tarif: 1000 },
  'certificat de célibat': { id: 'certificat-celibat', nom: 'Certificat de célibat', tarif: 1000 },
};

export function resolveEtatCivilDocument(typeDocument: string) {
  const normalized = typeDocument.trim().toLowerCase();
  return DOCUMENT_CATALOG[normalized] || { id: normalized || 'document', nom: typeDocument.trim(), tarif: 1000 };
}

export function normalizeEtatCivilStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'VALIDE') return 'DELIVREE';
  if (normalized === 'REJETE') return 'REJETEE';
  if (normalized === 'DELIVREE' || normalized === 'REJETEE' || normalized === 'EN_ATTENTE') return normalized;
  return 'EN_ATTENTE';
}

export class EtatCivilService {
  constructor(
    private readonly repository: EtatCivilRepository,
    private readonly contribuables: ContribuableLookup,
    private readonly auditTrail: AuditTrail
  ) {}

  async list(year: number) {
    const rows = await this.repository.list(year);
    return rows.map((row) => this.toView(row));
  }

  async create(actor: Actor, input: EtatCivilInput) {
    const contribuableId = String(input.contribuableId || '').trim();
    const typeDocument = String(input.typeDocument || '').trim();
    const exemplaires = Math.max(1, Number(input.exemplaires || 1));
    const statut = normalizeEtatCivilStatus(input.statut ? String(input.statut) : 'DELIVREE');
    const observations = input.observations ? String(input.observations).trim() : null;

    if (!contribuableId || !typeDocument) {
      throw new ValidationError('Le contribuable et le type de document sont requis.');
    }

    if (Number.isNaN(exemplaires) || exemplaires <= 0) {
      throw new ValidationError("Le nombre d'exemplaires doit être supérieur à zéro.");
    }

    const contribuable = await this.contribuables.findById(contribuableId);
    if (!contribuable) {
      throw new NotFoundError('Contribuable introuvable.');
    }

    const documentType = resolveEtatCivilDocument(typeDocument);
    const year = new Date().getFullYear();
    const numero = `EC-${year}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const montant = input.montant === undefined ? documentType.tarif * exemplaires : Number(input.montant);

    if (Number.isNaN(montant) || montant < 0) {
      throw new ValidationError("Le montant de la demande d'état civil est invalide.");
    }

    const created = await this.repository.create(
      {
        numero,
        contribuableId: contribuable.id,
        agentId: actor.userId,
        typeDocument: documentType.nom,
        exemplaires,
        montant,
        statut,
        observations,
        year,
      },
      {
        contribuableNom: contribuable.nom,
        contribuablePrenom: contribuable.prenom,
        contribuableNin: contribuable.nin,
        contribuableTelephone: contribuable.telephone,
        agentNom: null,
        agentPrenom: null,
      }
    );

    await this.auditTrail.record(actor, {
      action: 'Création demande état civil',
      module: 'État civil',
      details: `Demande ${created.numero} créée pour ${documentType.nom}`,
    });

    return this.toView(created);
  }

  async update(actor: Actor, requestId: string, input: EtatCivilInput) {
    const existing = await this.repository.findById(requestId);
    if (!existing) {
      throw new NotFoundError("Demande d'état civil introuvable.");
    }

    const nextContribuableId = input.contribuableId ? String(input.contribuableId).trim() : existing.contribuableId;
    let display: EtatCivilDisplay = existing;
    if (nextContribuableId !== existing.contribuableId) {
      const contribuable = await this.contribuables.findById(nextContribuableId);
      if (!contribuable) {
        throw new NotFoundError('Contribuable introuvable.');
      }
      display = {
        ...existing,
        contribuableNom: contribuable.nom,
        contribuablePrenom: contribuable.prenom,
        contribuableNin: contribuable.nin,
        contribuableTelephone: contribuable.telephone,
      };
    }

    const updated = await this.repository.update(
      requestId,
      {
        contribuableId: nextContribuableId,
        typeDocument: input.typeDocument ? String(input.typeDocument).trim() : existing.typeDocument,
        exemplaires: input.exemplaires !== undefined ? Math.max(1, Number(input.exemplaires)) : existing.exemplaires,
        montant: input.montant !== undefined ? Number(input.montant) : existing.montant,
        statut: input.statut ? normalizeEtatCivilStatus(String(input.statut)) : existing.statut,
        observations:
          input.observations === undefined ? existing.observations : String(input.observations || '').trim() || null,
      },
      display
    );

    await this.auditTrail.record(actor, {
      action: 'Mise à jour demande état civil',
      module: 'État civil',
      details: `Demande ${updated.numero} mise à jour`,
      status: updated.statut === 'REJETEE' ? 'warning' : 'success',
    });

    return this.toView(updated);
  }

  async delete(actor: Actor, requestId: string) {
    const existing = await this.repository.findById(requestId);
    if (!existing) {
      throw new NotFoundError("Demande d'état civil introuvable.");
    }
    await this.repository.delete(requestId);
    await this.auditTrail.record(actor, {
      action: 'Suppression demande état civil',
      module: 'État civil',
      details: `Suppression de la demande ${existing.numero}`,
      status: 'warning',
    });
  }

  async stats(year: number) {
    const demandes = await this.repository.listForStats(year);
    const demandesEnAttente = demandes.filter((item) => item.statut === 'EN_ATTENTE').length;
    const demandesDelivrees = demandes.filter((item) => item.statut === 'DELIVREE' || item.statut === 'VALIDE').length;
    const demandesRejetees = demandes.filter((item) => item.statut === 'REJETEE' || item.statut === 'REJETE').length;

    return {
      totalDemandes: demandes.length,
      demandesEnAttente,
      demandesDelivrees,
      demandesRejetees,
      enAttente: demandesEnAttente,
      validees: demandesDelivrees,
      recettes: demandes.reduce((sum, item) => sum + Number(item.montant || 0), 0),
    };
  }

  private toView(row: EtatCivilRequest) {
    return {
      id: row.id,
      numero: row.numero,
      contribuableId: row.contribuableId,
      typeDocument: row.typeDocument,
      exemplaires: Number(row.exemplaires || 0),
      montant: Number(row.montant || 0),
      statut: row.statut,
      observations: row.observations || undefined,
      date: row.createdAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      agent: row.agentPrenom && row.agentNom ? `${row.agentPrenom} ${row.agentNom}`.trim() : 'Agent État Civil',
      contribuable: {
        id: row.contribuableId,
        nom: row.contribuableNom,
        prenom: row.contribuablePrenom,
        nin: row.contribuableNin,
        telephone: row.contribuableTelephone,
      },
    };
  }
}
