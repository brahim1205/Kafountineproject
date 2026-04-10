import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';

type EtatCivilRequestRow = {
  id: string;
  numero: string;
  contribuableId: string;
  agentId: string | null;
  typeDocument: string;
  exemplaires: number;
  montant: number;
  statut: string;
  observations: string | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  contribuableNom: string;
  contribuablePrenom: string;
  contribuableNin: string;
  contribuableTelephone: string;
  agentNom: string | null;
  agentPrenom: string | null;
};

type UrbanismeCaseRow = {
  id: string;
  numero: string;
  contribuableId: string;
  agentId: string | null;
  type: string;
  description: string | null;
  surface: number | null;
  localisation: string | null;
  nature: string | null;
  montant: number;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  contribuableNom: string;
  contribuablePrenom: string;
  contribuableNin: string;
  contribuableTelephone: string;
  contribuableAdresse: string;
  agentNom: string | null;
  agentPrenom: string | null;
};

export class PlaceholderEtatCivilUrbanismeService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async listEtatCivil(year: number) {
    const rows = await prisma.$queryRawUnsafe<EtatCivilRequestRow[]>(
      `SELECT
        e.*,
        c."nom" AS "contribuableNom",
        c."prenom" AS "contribuablePrenom",
        c."nin" AS "contribuableNin",
        c."telephone" AS "contribuableTelephone",
        u."nom" AS "agentNom",
        u."prenom" AS "agentPrenom"
      FROM "EtatCivilRequest" e
      INNER JOIN "Contribuable" c ON c."id" = e."contribuableId"
      LEFT JOIN "User" u ON u."id" = e."agentId"
      WHERE e."year" = $1
      ORDER BY e."createdAt" DESC`,
      year
    );

    return rows.map((row) => this.mapEtatCivilRow(row));
  }

  async createEtatCivil(req: AuthRequest) {
    const payload = req.body || {};
    const contribuableId = String(payload.contribuableId || '').trim();
    const typeDocument = String(payload.typeDocument || '').trim();
    const exemplaires = Math.max(1, Number(payload.exemplaires || 1));
    const statut = this.normalizeEtatCivilStatus(payload.statut ? String(payload.statut) : 'DELIVREE');
    const observations = payload.observations ? String(payload.observations).trim() : null;

    if (!contribuableId || !typeDocument) {
      throw new ValidationError('Le contribuable et le type de document sont requis.');
    }

    if (Number.isNaN(exemplaires) || exemplaires <= 0) {
      throw new ValidationError("Le nombre d'exemplaires doit être supérieur à zéro.");
    }

    const contribuable = await prisma.contribuable.findUnique({ where: { id: contribuableId } });
    if (!contribuable) {
      throw new NotFoundError('Contribuable introuvable.');
    }

    const documentType = this.resolveEtatCivilDocument(typeDocument);
    const year = new Date().getFullYear();
    const numero = `EC-${year}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const montant = payload.montant === undefined ? documentType.tarif * exemplaires : Number(payload.montant);

    if (Number.isNaN(montant) || montant < 0) {
      throw new ValidationError("Le montant de la demande d'état civil est invalide.");
    }

    const [created] = await prisma.$queryRawUnsafe<EtatCivilRequestRow[]>(
      `INSERT INTO "EtatCivilRequest" ("id", "numero", "contribuableId", "agentId", "typeDocument", "exemplaires", "montant", "statut", "observations", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        "id",
        "numero",
        "contribuableId",
        "agentId",
        "typeDocument",
        "exemplaires",
        "montant",
        "statut",
        "observations",
        "year",
        "createdAt",
        "updatedAt",
        $11::text AS "contribuableNom",
        $12::text AS "contribuablePrenom",
        $13::text AS "contribuableNin",
        $14::text AS "contribuableTelephone",
        NULL::text AS "agentNom",
        NULL::text AS "agentPrenom"`,
      randomUUID(),
      numero,
      contribuable.id,
      req.user?.userId || null,
      documentType.nom,
      exemplaires,
      montant,
      statut,
      observations,
      year,
      contribuable.nom,
      contribuable.prenom,
      contribuable.nin,
      contribuable.telephone
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création demande état civil',
      module: 'État civil',
      details: `Demande ${created.numero} créée pour ${documentType.nom}`,
    });

    return this.mapEtatCivilRow(created);
  }

  async updateEtatCivil(req: AuthRequest) {
    const requestId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<EtatCivilRequestRow[]>(
      `SELECT
        e.*,
        c."nom" AS "contribuableNom",
        c."prenom" AS "contribuablePrenom",
        c."nin" AS "contribuableNin",
        c."telephone" AS "contribuableTelephone",
        u."nom" AS "agentNom",
        u."prenom" AS "agentPrenom"
      FROM "EtatCivilRequest" e
      INNER JOIN "Contribuable" c ON c."id" = e."contribuableId"
      LEFT JOIN "User" u ON u."id" = e."agentId"
      WHERE e."id" = $1
      LIMIT 1`,
      requestId
    );

    if (!existing) {
      throw new NotFoundError("Demande d'état civil introuvable.");
    }

    const payload = req.body || {};
    const nextStatus = payload.statut ? this.normalizeEtatCivilStatus(String(payload.statut)) : existing.statut;
    const nextObservations =
      payload.observations === undefined ? existing.observations : String(payload.observations || '').trim() || null;

    const [updated] = await prisma.$queryRawUnsafe<EtatCivilRequestRow[]>(
      `UPDATE "EtatCivilRequest"
       SET "statut" = $2, "observations" = $3, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING
        "id",
        "numero",
        "contribuableId",
        "agentId",
        "typeDocument",
        "exemplaires",
        "montant",
        "statut",
        "observations",
        "year",
        "createdAt",
        "updatedAt",
        $4::text AS "contribuableNom",
        $5::text AS "contribuablePrenom",
        $6::text AS "contribuableNin",
        $7::text AS "contribuableTelephone",
        $8::text AS "agentNom",
        $9::text AS "agentPrenom"`,
      requestId,
      nextStatus,
      nextObservations,
      existing.contribuableNom,
      existing.contribuablePrenom,
      existing.contribuableNin,
      existing.contribuableTelephone,
      existing.agentNom,
      existing.agentPrenom
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour demande état civil',
      module: 'État civil',
      details: `Demande ${updated.numero} passée au statut ${updated.statut}`,
      status: updated.statut === 'REJETEE' ? 'warning' : 'success',
    });

    return this.mapEtatCivilRow(updated);
  }

  async etatCivilStats(year: number) {
    const demandes = await prisma.$queryRawUnsafe<Array<Pick<EtatCivilRequestRow, 'montant' | 'statut'>>>(
      'SELECT "montant", "statut" FROM "EtatCivilRequest" WHERE "year" = $1',
      year
    );
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

  async urbanismeList(page: number, limit: number, year: number, statutFilter: string, typeFilter: string) {
    const rows = await prisma.$queryRawUnsafe<UrbanismeCaseRow[]>(
      `SELECT
        u.*,
        c."nom" AS "contribuableNom",
        c."prenom" AS "contribuablePrenom",
        c."nin" AS "contribuableNin",
        c."telephone" AS "contribuableTelephone",
        c."adresse" AS "contribuableAdresse",
        a."nom" AS "agentNom",
        a."prenom" AS "agentPrenom"
      FROM "UrbanismeCase" u
      INNER JOIN "Contribuable" c ON c."id" = u."contribuableId"
      LEFT JOIN "User" a ON a."id" = u."agentId"
      WHERE u."year" = $1
      ORDER BY u."createdAt" DESC`,
      year
    );

    const filtered = rows.filter((row) => {
      const matchesStatus = !statutFilter || row.statut === statutFilter;
      const matchesType = !typeFilter || row.type === typeFilter;
      return matchesStatus && matchesType;
    });

    return {
      data: filtered.slice((page - 1) * limit, page * limit).map((row) => this.mapUrbanismeRow(row)),
      total: filtered.length,
    };
  }

  async urbanismeShow(id: string) {
    const [row] = await prisma.$queryRawUnsafe<UrbanismeCaseRow[]>(
      `SELECT
        u.*,
        c."nom" AS "contribuableNom",
        c."prenom" AS "contribuablePrenom",
        c."nin" AS "contribuableNin",
        c."telephone" AS "contribuableTelephone",
        c."adresse" AS "contribuableAdresse",
        a."nom" AS "agentNom",
        a."prenom" AS "agentPrenom"
      FROM "UrbanismeCase" u
      INNER JOIN "Contribuable" c ON c."id" = u."contribuableId"
      LEFT JOIN "User" a ON a."id" = u."agentId"
      WHERE u."id" = $1
      LIMIT 1`,
      id
    );
    if (!row) {
      throw new NotFoundError("Dossier d'urbanisme introuvable.");
    }
    return this.mapUrbanismeRow(row);
  }

  async createUrbanisme(req: AuthRequest) {
    const payload = req.body || {};
    const contribuableId = String(payload.contribuableId || '').trim();
    const type = String(payload.type || '').trim();

    if (!contribuableId || !type) {
      throw new ValidationError("Le contribuable et le type de dossier d'urbanisme sont requis.");
    }

    const contribuable = await prisma.contribuable.findUnique({ where: { id: contribuableId } });
    if (!contribuable) {
      throw new NotFoundError('Contribuable introuvable.');
    }

    const urbanismeType = this.resolveUrbanismeType(type);
    const surface = payload.surface === undefined || payload.surface === null ? null : Number(payload.surface);
    if (surface !== null && (Number.isNaN(surface) || surface < 0)) {
      throw new ValidationError("La surface du dossier d'urbanisme est invalide.");
    }

    const montant =
      payload.montant === undefined
        ? urbanismeType.unite === 'm²'
          ? urbanismeType.tarif * Math.max(1, surface || 1)
          : urbanismeType.tarif
        : Number(payload.montant);

    if (Number.isNaN(montant) || montant < 0) {
      throw new ValidationError("Le montant du dossier d'urbanisme est invalide.");
    }

    const year = new Date().getFullYear();
    const numero = payload.numero
      ? String(payload.numero).trim()
      : `URB-${year}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const statut = payload.statut ? this.normalizeUrbanismeStatus(String(payload.statut)) : 'EN_ATTENTE';

    const [created] = await prisma.$queryRawUnsafe<UrbanismeCaseRow[]>(
      `INSERT INTO "UrbanismeCase" ("id", "numero", "contribuableId", "agentId", "type", "description", "surface", "localisation", "nature", "montant", "statut", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        "id",
        "numero",
        "contribuableId",
        "agentId",
        "type",
        "description",
        "surface",
        "localisation",
        "nature",
        "montant",
        "statut",
        "year",
        "createdAt",
        "updatedAt",
        $13::text AS "contribuableNom",
        $14::text AS "contribuablePrenom",
        $15::text AS "contribuableNin",
        $16::text AS "contribuableTelephone",
        $17::text AS "contribuableAdresse",
        NULL::text AS "agentNom",
        NULL::text AS "agentPrenom"`,
      randomUUID(),
      numero,
      contribuable.id,
      req.user?.userId || null,
      urbanismeType.id,
      payload.description ? String(payload.description).trim() : null,
      surface,
      payload.localisation ? String(payload.localisation).trim() : null,
      payload.nature ? String(payload.nature).trim() : null,
      montant,
      statut,
      year,
      contribuable.nom,
      contribuable.prenom,
      contribuable.nin,
      contribuable.telephone,
      contribuable.adresse
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création dossier urbanisme',
      module: 'Urbanisme',
      details: `Dossier ${created.numero} créé (${urbanismeType.nom})`,
    });

    return this.mapUrbanismeRow(created);
  }

  async updateUrbanisme(req: AuthRequest) {
    const dossierId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<UrbanismeCaseRow[]>(
      `SELECT
        u.*,
        c."nom" AS "contribuableNom",
        c."prenom" AS "contribuablePrenom",
        c."nin" AS "contribuableNin",
        c."telephone" AS "contribuableTelephone",
        c."adresse" AS "contribuableAdresse",
        a."nom" AS "agentNom",
        a."prenom" AS "agentPrenom"
      FROM "UrbanismeCase" u
      INNER JOIN "Contribuable" c ON c."id" = u."contribuableId"
      LEFT JOIN "User" a ON a."id" = u."agentId"
      WHERE u."id" = $1
      LIMIT 1`,
      dossierId
    );

    if (!existing) {
      throw new NotFoundError("Dossier d'urbanisme introuvable.");
    }

    const payload = req.body || {};
    const nextType = payload.type ? this.resolveUrbanismeType(String(payload.type)).id : existing.type;
    const nextStatus = payload.statut ? this.normalizeUrbanismeStatus(String(payload.statut)) : existing.statut;
    const nextSurface = payload.surface === undefined ? existing.surface : payload.surface === null ? null : Number(payload.surface);

    if (nextSurface !== null && (Number.isNaN(nextSurface) || nextSurface < 0)) {
      throw new ValidationError("La surface du dossier d'urbanisme est invalide.");
    }

    const nextMontant = payload.montant === undefined ? existing.montant : Number(payload.montant);
    if (Number.isNaN(nextMontant) || nextMontant < 0) {
      throw new ValidationError("Le montant du dossier d'urbanisme est invalide.");
    }

    const [updated] = await prisma.$queryRawUnsafe<UrbanismeCaseRow[]>(
      `UPDATE "UrbanismeCase"
       SET
        "numero" = $2,
        "type" = $3,
        "description" = $4,
        "surface" = $5,
        "localisation" = $6,
        "nature" = $7,
        "montant" = $8,
        "statut" = $9,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING
        "id",
        "numero",
        "contribuableId",
        "agentId",
        "type",
        "description",
        "surface",
        "localisation",
        "nature",
        "montant",
        "statut",
        "year",
        "createdAt",
        "updatedAt",
        $10::text AS "contribuableNom",
        $11::text AS "contribuablePrenom",
        $12::text AS "contribuableNin",
        $13::text AS "contribuableTelephone",
        $14::text AS "contribuableAdresse",
        $15::text AS "agentNom",
        $16::text AS "agentPrenom"`,
      dossierId,
      payload.numero ? String(payload.numero).trim() : existing.numero,
      nextType,
      payload.description === undefined ? existing.description : String(payload.description || '').trim() || null,
      nextSurface,
      payload.localisation === undefined ? existing.localisation : String(payload.localisation || '').trim() || null,
      payload.nature === undefined ? existing.nature : String(payload.nature || '').trim() || null,
      nextMontant,
      nextStatus,
      existing.contribuableNom,
      existing.contribuablePrenom,
      existing.contribuableNin,
      existing.contribuableTelephone,
      existing.contribuableAdresse,
      existing.agentNom,
      existing.agentPrenom
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour dossier urbanisme',
      module: 'Urbanisme',
      details: `Dossier ${updated.numero} mis à jour (${updated.statut})`,
      status: updated.statut === 'REJETE' ? 'warning' : 'success',
    });

    return this.mapUrbanismeRow(updated);
  }

  async deleteUrbanisme(req: AuthRequest) {
    const dossierId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<Array<Pick<UrbanismeCaseRow, 'id' | 'numero' | 'type'>>>(
      'SELECT "id", "numero", "type" FROM "UrbanismeCase" WHERE "id" = $1 LIMIT 1',
      dossierId
    );
    if (!existing) {
      throw new NotFoundError("Dossier d'urbanisme introuvable.");
    }
    await prisma.$executeRaw`DELETE FROM "UrbanismeCase" WHERE "id" = ${dossierId}`;
    await this.supportService.writeAuditLog(req, {
      action: 'Suppression dossier urbanisme',
      module: 'Urbanisme',
      details: `Suppression du dossier ${existing.numero} (${existing.type})`,
      status: 'warning',
    });
  }

  async urbanismeStats(year: number) {
    const dossiers = await prisma.$queryRawUnsafe<Array<Pick<UrbanismeCaseRow, 'montant' | 'statut'>>>(
      'SELECT "montant", "statut" FROM "UrbanismeCase" WHERE "year" = $1',
      year
    );
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

  private mapEtatCivilRow(row: EtatCivilRequestRow) {
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

  private mapUrbanismeRow(row: UrbanismeCaseRow) {
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

  private resolveEtatCivilDocument(typeDocument: string) {
    const normalized = typeDocument.trim().toLowerCase();
    const catalog: Record<string, { id: string; nom: string; tarif: number }> = {
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

    return catalog[normalized] || { id: normalized || 'document', nom: typeDocument.trim(), tarif: 1000 };
  }

  private resolveUrbanismeType(type: string) {
    const normalized = type.trim().toLowerCase();
    const catalog: Record<string, { id: string; nom: string; tarif: number; unite: string }> = {
      'permis-construire': { id: 'permis-construire', nom: 'Permis de construire', tarif: 5000, unite: 'm²' },
      'permis de construire': { id: 'permis-construire', nom: 'Permis de construire', tarif: 5000, unite: 'm²' },
      'autorisation-travaux': { id: 'autorisation-travaux', nom: 'Autorisation de travaux', tarif: 2500, unite: 'dossier' },
      'autorisation de travaux': { id: 'autorisation-travaux', nom: 'Autorisation de travaux', tarif: 2500, unite: 'dossier' },
      'certificat-conformite': { id: 'certificat-conformite', nom: 'Certificat de conformité', tarif: 2000, unite: 'dossier' },
      'certificat de conformité': { id: 'certificat-conformite', nom: 'Certificat de conformité', tarif: 2000, unite: 'dossier' },
      'titre-foncier': { id: 'titre-foncier', nom: 'Titre foncier', tarif: 10000, unite: 'dossier' },
      'titre foncier': { id: 'titre-foncier', nom: 'Titre foncier', tarif: 10000, unite: 'dossier' },
    };

    return catalog[normalized] || { id: normalized || 'dossier-urbanisme', nom: type.trim(), tarif: 2500, unite: 'dossier' };
  }

  private normalizeEtatCivilStatus(status: string) {
    const normalized = status.trim().toUpperCase();
    if (normalized === 'VALIDE') return 'DELIVREE';
    if (normalized === 'REJETE') return 'REJETEE';
    if (normalized === 'DELIVREE' || normalized === 'REJETEE' || normalized === 'EN_ATTENTE') return normalized;
    return 'EN_ATTENTE';
  }

  private normalizeUrbanismeStatus(status: string) {
    const normalized = status.trim().toUpperCase();
    if (normalized === 'VALIDE' || normalized === 'REJETE' || normalized === 'EN_ATTENTE') {
      return normalized;
    }
    return 'EN_ATTENTE';
  }
}
