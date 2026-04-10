import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';

type MarketPlaceRow = {
  id: string;
  numeroPlace: string;
  type: string;
  zone: string;
  occupantId: string | null;
  activite: string | null;
  telephone: string | null;
  dateAttribution: Date | null;
  tarif: number;
  periode: string;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  occupantNom: string | null;
  occupantPrenom: string | null;
  occupantNin: string | null;
  occupantTelephone: string | null;
};

type MarketPaymentRow = {
  id: string;
  placeId: string;
  montant: number;
  reference: string | null;
  periode: string;
  statut: string;
  datePaiement: Date | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  numeroPlace: string;
  placeType: string;
  placeZone: string;
  occupantId: string | null;
  activite: string | null;
  tarif: number;
  placePeriode: string;
  placeStatut: string;
  placeTelephone: string | null;
  placeDateAttribution: Date | null;
  occupantNom: string | null;
  occupantPrenom: string | null;
  occupantNin: string | null;
  occupantTelephone: string | null;
};

type MotoRow = {
  id: string;
  matricule: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string | null;
  proprietaireId: string;
  conducteurId: string | null;
  permis: string | null;
  statut: string;
  photo: string | null;
  enRetard: boolean;
  montantPenalite: number;
  prochainPaiement: Date | null;
  dernierPaiement: Date | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  proprietaireNom: string;
  proprietairePrenom: string;
  proprietaireNin: string;
  proprietaireTelephone: string;
  conducteurNom: string | null;
  conducteurPrenom: string | null;
  conducteurNin: string | null;
  conducteurTelephone: string | null;
};

type MotoPaymentRow = {
  id: string;
  motoId: string;
  montant: number;
  reference: string | null;
  statut: string;
  datePaiement: Date | null;
  mois: string | null;
  numeroRecu: string | null;
  agent: string | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  matricule: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string | null;
  proprietaireId: string;
  conducteurId: string | null;
  permis: string | null;
  motoStatut: string;
  photo: string | null;
  enRetard: boolean;
  montantPenalite: number;
  prochainPaiement: Date | null;
  dernierPaiement: Date | null;
  proprietaireNom: string;
  proprietairePrenom: string;
  proprietaireNin: string;
  proprietaireTelephone: string;
  conducteurNom: string | null;
  conducteurPrenom: string | null;
  conducteurNin: string | null;
  conducteurTelephone: string | null;
};

export class PlaceholderMarketMotosService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async listPlacesMarche(year: number) {
    const rows = await prisma.$queryRawUnsafe<MarketPlaceRow[]>(
      `SELECT
        p.*,
        c."nom" AS "occupantNom",
        c."prenom" AS "occupantPrenom",
        c."nin" AS "occupantNin",
        c."telephone" AS "occupantTelephone"
      FROM "MarketPlace" p
      LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"
      WHERE p."year" = $1
      ORDER BY p."numeroPlace" ASC`,
      year
    );
    return rows.map((row) => this.mapMarketPlaceRow(row));
  }

  async createPlaceMarche(req: AuthRequest) {
    const payload = req.body || {};
    const numeroPlace = String(payload.numeroPlace || payload.numero || '').trim();
    const type = String(payload.type || '').trim();
    const zone = String(payload.zone || '').trim();
    const tarif = Number(payload.tarif || 0);
    const periode = String(payload.periode || 'mensuel').trim();
    const statut = this.normalizeMarketPlaceStatus(String(payload.statut || 'LIBRE'));
    const occupantId = payload.occupantId ? String(payload.occupantId).trim() : null;

    if (!numeroPlace || !type || !zone) {
      throw new ValidationError('Le numéro, le type et la zone de la place sont requis.');
    }

    if (Number.isNaN(tarif) || tarif < 0) {
      throw new ValidationError('Le tarif de la place est invalide.');
    }

    const year = payload.year ? Number(payload.year) : new Date().getFullYear();
    const duplicate = await prisma.$queryRawUnsafe<MarketPlaceRow[]>(
      'SELECT * FROM "MarketPlace" WHERE "numeroPlace" = $1 AND "year" = $2 LIMIT 1',
      numeroPlace,
      year
    );
    if (duplicate.length > 0) {
      throw new ConflictError('Une place avec ce numéro existe déjà pour cette année.');
    }

    let occupant = null;
    if (occupantId) {
      occupant = await prisma.contribuable.findUnique({ where: { id: occupantId } });
      if (!occupant) {
        throw new NotFoundError('Occupant introuvable.');
      }
    }

    const [created] = await prisma.$queryRawUnsafe<MarketPlaceRow[]>(
      `INSERT INTO "MarketPlace" ("id", "numeroPlace", "type", "zone", "occupantId", "activite", "telephone", "dateAttribution", "tarif", "periode", "statut", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        "id",
        "numeroPlace",
        "type",
        "zone",
        "occupantId",
        "activite",
        "telephone",
        "dateAttribution",
        "tarif",
        "periode",
        "statut",
        "year",
        "createdAt",
        "updatedAt",
        $13::text AS "occupantNom",
        $14::text AS "occupantPrenom",
        $15::text AS "occupantNin",
        $16::text AS "occupantTelephone"`,
      randomUUID(),
      numeroPlace,
      type,
      zone,
      occupantId,
      payload.activite ? String(payload.activite).trim() : null,
      occupant?.telephone || null,
      occupantId ? new Date() : null,
      tarif,
      periode,
      statut,
      year,
      occupant?.nom || null,
      occupant?.prenom || null,
      occupant?.nin || null,
      occupant?.telephone || null
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création place marché',
      module: 'Marché',
      details: `Place ${created.numeroPlace} créée (${created.type})`,
    });

    return this.mapMarketPlaceRow(created);
  }

  async updatePlaceMarche(req: AuthRequest) {
    const placeId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<MarketPlaceRow[]>(
      `SELECT
        p.*,
        c."nom" AS "occupantNom",
        c."prenom" AS "occupantPrenom",
        c."nin" AS "occupantNin",
        c."telephone" AS "occupantTelephone"
      FROM "MarketPlace" p
      LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"
      WHERE p."id" = $1
      LIMIT 1`,
      placeId
    );
    if (!existing) {
      throw new NotFoundError('Place de marché introuvable.');
    }

    const payload = req.body || {};
    const nextNumero = payload.numeroPlace ? String(payload.numeroPlace).trim() : existing.numeroPlace;
    const nextYear = payload.year ? Number(payload.year) : existing.year;
    if (nextNumero !== existing.numeroPlace || nextYear !== existing.year) {
      const duplicate = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT "id" FROM "MarketPlace" WHERE "numeroPlace" = $1 AND "year" = $2 LIMIT 1',
        nextNumero,
        nextYear
      );
      if (duplicate[0] && duplicate[0].id !== existing.id) {
        throw new ConflictError('Une place avec ce numéro existe déjà pour cette année.');
      }
    }

    const occupantId =
      payload.occupantId === undefined ? existing.occupantId : String(payload.occupantId || '').trim() || null;
    let occupant = null;
    if (occupantId) {
      occupant = await prisma.contribuable.findUnique({ where: { id: occupantId } });
      if (!occupant) {
        throw new NotFoundError('Occupant introuvable.');
      }
    }

    const [updated] = await prisma.$queryRawUnsafe<MarketPlaceRow[]>(
      `UPDATE "MarketPlace"
       SET
        "numeroPlace" = $2,
        "type" = $3,
        "zone" = $4,
        "occupantId" = $5,
        "activite" = $6,
        "telephone" = $7,
        "dateAttribution" = $8,
        "tarif" = $9,
        "periode" = $10,
        "statut" = $11,
        "year" = $12,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING
        "id",
        "numeroPlace",
        "type",
        "zone",
        "occupantId",
        "activite",
        "telephone",
        "dateAttribution",
        "tarif",
        "periode",
        "statut",
        "year",
        "createdAt",
        "updatedAt",
        $13::text AS "occupantNom",
        $14::text AS "occupantPrenom",
        $15::text AS "occupantNin",
        $16::text AS "occupantTelephone"`,
      placeId,
      nextNumero,
      payload.type ? String(payload.type).trim() : existing.type,
      payload.zone ? String(payload.zone).trim() : existing.zone,
      occupantId,
      payload.activite === undefined ? existing.activite : String(payload.activite || '').trim() || null,
      occupant?.telephone || existing.telephone,
      occupantId ? existing.dateAttribution || new Date() : null,
      payload.tarif === undefined ? existing.tarif : Number(payload.tarif),
      payload.periode ? String(payload.periode).trim() : existing.periode,
      payload.statut ? this.normalizeMarketPlaceStatus(String(payload.statut)) : existing.statut,
      nextYear,
      occupant?.nom || null,
      occupant?.prenom || null,
      occupant?.nin || null,
      occupant?.telephone || null
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour place marché',
      module: 'Marché',
      details: `Place ${updated.numeroPlace} mise à jour`,
    });

    return this.mapMarketPlaceRow(updated);
  }

  async listPaiementsMarche(year: number) {
    const rows = await prisma.$queryRawUnsafe<MarketPaymentRow[]>(
      `SELECT
        mp.*,
        p."numeroPlace",
        p."type" AS "placeType",
        p."zone" AS "placeZone",
        p."occupantId",
        p."activite",
        p."tarif",
        p."periode" AS "placePeriode",
        p."statut" AS "placeStatut",
        p."telephone" AS "placeTelephone",
        p."dateAttribution" AS "placeDateAttribution",
        c."nom" AS "occupantNom",
        c."prenom" AS "occupantPrenom",
        c."nin" AS "occupantNin",
        c."telephone" AS "occupantTelephone"
      FROM "MarketPayment" mp
      INNER JOIN "MarketPlace" p ON p."id" = mp."placeId"
      LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"
      WHERE mp."year" = $1
      ORDER BY COALESCE(mp."datePaiement", mp."createdAt") DESC`,
      year
    );
    return rows.map((row) => this.mapMarketPaymentRow(row));
  }

  async createPaiementMarche(req: AuthRequest) {
    const payload = req.body || {};
    const placeId = String(payload.placeId || '').trim();
    const periode = String(payload.periode || '').trim();
    const montant = Number(payload.montant || 0);
    const reference = payload.reference ? String(payload.reference).trim() : null;

    if (!placeId || !periode) {
      throw new ValidationError('La place et la période de paiement sont requises.');
    }

    if (Number.isNaN(montant) || montant <= 0) {
      throw new ValidationError('Le montant du paiement marché est invalide.');
    }

    const [place] = await prisma.$queryRawUnsafe<MarketPlaceRow[]>(
      `SELECT
        p.*,
        c."nom" AS "occupantNom",
        c."prenom" AS "occupantPrenom",
        c."nin" AS "occupantNin",
        c."telephone" AS "occupantTelephone"
      FROM "MarketPlace" p
      LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"
      WHERE p."id" = $1
      LIMIT 1`,
      placeId
    );
    if (!place) {
      throw new NotFoundError('Place de marché introuvable.');
    }

    const year = payload.year ? Number(payload.year) : new Date().getFullYear();
    const [created] = await prisma.$queryRawUnsafe<MarketPaymentRow[]>(
      `INSERT INTO "MarketPayment" ("id", "placeId", "montant", "reference", "periode", "statut", "datePaiement", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'PAYE', CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        "id",
        "placeId",
        "montant",
        "reference",
        "periode",
        "statut",
        "datePaiement",
        "year",
        "createdAt",
        "updatedAt",
        $7::text AS "numeroPlace",
        $8::text AS "placeType",
        $9::text AS "placeZone",
        $10::text AS "occupantId",
        $11::text AS "activite",
        $12::double precision AS "tarif",
        $13::text AS "placePeriode",
        $14::text AS "placeStatut",
        $15::text AS "placeTelephone",
        $16::timestamp AS "placeDateAttribution",
        $17::text AS "occupantNom",
        $18::text AS "occupantPrenom",
        $19::text AS "occupantNin",
        $20::text AS "occupantTelephone"`,
      randomUUID(),
      placeId,
      montant,
      reference,
      periode,
      year,
      place.numeroPlace,
      place.type,
      place.zone,
      place.occupantId,
      place.activite,
      place.tarif,
      place.periode,
      place.statut,
      place.telephone,
      place.dateAttribution,
      place.occupantNom,
      place.occupantPrenom,
      place.occupantNin,
      place.occupantTelephone
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Paiement marché',
      module: 'Marché',
      details: `Paiement enregistré pour la place ${place.numeroPlace} (${montant} FCFA)`,
    });

    return this.mapMarketPaymentRow(created);
  }

  async marcheStats(year: number) {
    const [places, paiements] = await Promise.all([
      prisma.$queryRawUnsafe<Array<Pick<MarketPlaceRow, 'statut' | 'occupantId'>>>(
        'SELECT "statut", "occupantId" FROM "MarketPlace" WHERE "year" = $1',
        year
      ),
      prisma.$queryRawUnsafe<Array<Pick<MarketPaymentRow, 'montant' | 'statut'>>>(
        'SELECT "montant", "statut" FROM "MarketPayment" WHERE "year" = $1',
        year
      ),
    ]);
    const placesTotales = places.length;
    const placesOccupees = places.filter((item) => item.statut === 'OCCUPEE').length;
    return {
      placesTotales,
      placesOccupees,
      placesDisponibles: Math.max(placesTotales - placesOccupees, 0),
      recettesMois: paiements.reduce((sum, item) => sum + Number(item.montant || 0), 0),
      tauxOccupation: placesTotales > 0 ? Math.round((placesOccupees / placesTotales) * 100) : 0,
      nouveauxCommercants: places.filter((item) => item.occupantId).length,
      recettesEnRetard: paiements.filter((item) => item.statut !== 'PAYE').reduce((sum, item) => sum + Number(item.montant || 0), 0),
    };
  }

  async listMotos(year: number, search: string, limit?: number) {
    const rows = await prisma.$queryRawUnsafe<MotoRow[]>(
      `SELECT
        m.*,
        p."nom" AS "proprietaireNom",
        p."prenom" AS "proprietairePrenom",
        p."nin" AS "proprietaireNin",
        p."telephone" AS "proprietaireTelephone",
        d."nom" AS "conducteurNom",
        d."prenom" AS "conducteurPrenom",
        d."nin" AS "conducteurNin",
        d."telephone" AS "conducteurTelephone"
      FROM "MotoRegistration" m
      INNER JOIN "Contribuable" p ON p."id" = m."proprietaireId"
      LEFT JOIN "Contribuable" d ON d."id" = m."conducteurId"
      WHERE m."year" = $1
      ORDER BY m."createdAt" DESC`,
      year
    );
    const filtered = rows.filter((row) => {
      if (!search) return true;
      const haystack = [
        row.matricule,
        row.marque,
        row.modele,
        row.permis || '',
        row.proprietaireNom,
        row.proprietairePrenom,
        row.conducteurNom || '',
        row.conducteurPrenom || '',
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
    return filtered.slice(0, limit && limit > 0 ? limit : filtered.length).map((row) => this.mapMotoRow(row));
  }

  async createMoto(req: AuthRequest) {
    const payload = req.body || {};
    const matricule = String(payload.matricule || '').trim().toUpperCase();
    const marque = String(payload.marque || '').trim();
    const modele = String(payload.modele || '').trim();
    const annee = Number(payload.annee || new Date().getFullYear());
    const proprietaireId = String(payload.proprietaireId || '').trim();
    const conducteurId = payload.conducteurId ? String(payload.conducteurId).trim() : proprietaireId;
    const permis = payload.permis ? String(payload.permis).trim() : null;

    if (!matricule || !marque || !modele || !proprietaireId) {
      throw new ValidationError('La moto doit avoir un matricule, une marque, un modèle et un propriétaire.');
    }

    const existingMatricule = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "MotoRegistration" WHERE "matricule" = $1 LIMIT 1',
      matricule
    );
    if (existingMatricule.length > 0) {
      throw new ConflictError('Ce matricule existe déjà.');
    }

    if (permis) {
      const existingPermis = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT "id" FROM "MotoRegistration" WHERE "permis" = $1 LIMIT 1',
        permis
      );
      if (existingPermis.length > 0) {
        throw new ConflictError('Ce permis existe déjà.');
      }
    }

    const [proprietaire, conducteur] = await Promise.all([
      prisma.contribuable.findUnique({ where: { id: proprietaireId } }),
      conducteurId ? prisma.contribuable.findUnique({ where: { id: conducteurId } }) : Promise.resolve(null),
    ]);
    if (!proprietaire) {
      throw new NotFoundError('Propriétaire introuvable.');
    }
    if (conducteurId && !conducteur) {
      throw new NotFoundError('Conducteur introuvable.');
    }

    const year = annee;
    const [created] = await prisma.$queryRawUnsafe<MotoRow[]>(
      `INSERT INTO "MotoRegistration" ("id", "matricule", "marque", "modele", "annee", "couleur", "proprietaireId", "conducteurId", "permis", "statut", "photo", "enRetard", "montantPenalite", "prochainPaiement", "dernierPaiement", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12, $13, NULL, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        "id",
        "matricule",
        "marque",
        "modele",
        "annee",
        "couleur",
        "proprietaireId",
        "conducteurId",
        "permis",
        "statut",
        "photo",
        "enRetard",
        "montantPenalite",
        "prochainPaiement",
        "dernierPaiement",
        "year",
        "createdAt",
        "updatedAt",
        $15::text AS "proprietaireNom",
        $16::text AS "proprietairePrenom",
        $17::text AS "proprietaireNin",
        $18::text AS "proprietaireTelephone",
        $19::text AS "conducteurNom",
        $20::text AS "conducteurPrenom",
        $21::text AS "conducteurNin",
        $22::text AS "conducteurTelephone"`,
      randomUUID(),
      matricule,
      marque,
      modele,
      annee,
      payload.couleur ? String(payload.couleur).trim() : null,
      proprietaireId,
      conducteurId || null,
      permis,
      payload.statut ? String(payload.statut).trim().toUpperCase() : 'ACTIVE',
      payload.photo ? String(payload.photo) : null,
      250,
      this.getNextMonthDueDate(),
      year,
      proprietaire.nom,
      proprietaire.prenom,
      proprietaire.nin,
      proprietaire.telephone,
      conducteur?.nom || proprietaire.nom,
      conducteur?.prenom || proprietaire.prenom,
      conducteur?.nin || proprietaire.nin,
      conducteur?.telephone || proprietaire.telephone
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Enregistrement moto',
      module: 'Motos',
      details: `Moto ${created.matricule} enregistrée`,
    });

    return this.mapMotoRow(created);
  }

  async updateMoto(req: AuthRequest) {
    const motoId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<MotoRow[]>(
      `SELECT
        m.*,
        p."nom" AS "proprietaireNom",
        p."prenom" AS "proprietairePrenom",
        p."nin" AS "proprietaireNin",
        p."telephone" AS "proprietaireTelephone",
        d."nom" AS "conducteurNom",
        d."prenom" AS "conducteurPrenom",
        d."nin" AS "conducteurNin",
        d."telephone" AS "conducteurTelephone"
      FROM "MotoRegistration" m
      INNER JOIN "Contribuable" p ON p."id" = m."proprietaireId"
      LEFT JOIN "Contribuable" d ON d."id" = m."conducteurId"
      WHERE m."id" = $1
      LIMIT 1`,
      motoId
    );
    if (!existing) {
      throw new NotFoundError('Moto introuvable.');
    }

    const payload = req.body || {};
    const nextMatricule = payload.matricule ? String(payload.matricule).trim().toUpperCase() : existing.matricule;
    if (nextMatricule !== existing.matricule) {
      const duplicate = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT "id" FROM "MotoRegistration" WHERE "matricule" = $1 LIMIT 1',
        nextMatricule
      );
      if (duplicate[0] && duplicate[0].id !== existing.id) {
        throw new ConflictError('Ce matricule existe déjà.');
      }
    }

    const nextPermis = payload.permis === undefined ? existing.permis : String(payload.permis || '').trim() || null;
    if (nextPermis && nextPermis !== existing.permis) {
      const duplicate = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT "id" FROM "MotoRegistration" WHERE "permis" = $1 LIMIT 1',
        nextPermis
      );
      if (duplicate[0] && duplicate[0].id !== existing.id) {
        throw new ConflictError('Ce permis existe déjà.');
      }
    }

    const nextProprietaireId =
      payload.proprietaireId === undefined ? existing.proprietaireId : String(payload.proprietaireId || '').trim();
    const nextConducteurId =
      payload.conducteurId === undefined ? existing.conducteurId : String(payload.conducteurId || '').trim() || null;

    const [proprietaire, conducteur] = await Promise.all([
      prisma.contribuable.findUnique({ where: { id: nextProprietaireId } }),
      nextConducteurId ? prisma.contribuable.findUnique({ where: { id: nextConducteurId } }) : Promise.resolve(null),
    ]);
    if (!proprietaire) {
      throw new NotFoundError('Propriétaire introuvable.');
    }
    if (nextConducteurId && !conducteur) {
      throw new NotFoundError('Conducteur introuvable.');
    }

    const [updated] = await prisma.$queryRawUnsafe<MotoRow[]>(
      `UPDATE "MotoRegistration"
       SET
        "matricule" = $2,
        "marque" = $3,
        "modele" = $4,
        "annee" = $5,
        "couleur" = $6,
        "proprietaireId" = $7,
        "conducteurId" = $8,
        "permis" = $9,
        "statut" = $10,
        "photo" = $11,
        "enRetard" = $12,
        "montantPenalite" = $13,
        "prochainPaiement" = $14,
        "dernierPaiement" = $15,
        "year" = $16,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING
        "id",
        "matricule",
        "marque",
        "modele",
        "annee",
        "couleur",
        "proprietaireId",
        "conducteurId",
        "permis",
        "statut",
        "photo",
        "enRetard",
        "montantPenalite",
        "prochainPaiement",
        "dernierPaiement",
        "year",
        "createdAt",
        "updatedAt",
        $17::text AS "proprietaireNom",
        $18::text AS "proprietairePrenom",
        $19::text AS "proprietaireNin",
        $20::text AS "proprietaireTelephone",
        $21::text AS "conducteurNom",
        $22::text AS "conducteurPrenom",
        $23::text AS "conducteurNin",
        $24::text AS "conducteurTelephone"`,
      motoId,
      nextMatricule,
      payload.marque ? String(payload.marque).trim() : existing.marque,
      payload.modele ? String(payload.modele).trim() : existing.modele,
      payload.annee === undefined ? existing.annee : Number(payload.annee),
      payload.couleur === undefined ? existing.couleur : String(payload.couleur || '').trim() || null,
      nextProprietaireId,
      nextConducteurId,
      nextPermis,
      payload.statut ? String(payload.statut).trim().toUpperCase() : existing.statut,
      payload.photo === undefined ? existing.photo : String(payload.photo || '') || null,
      payload.enRetard === undefined ? existing.enRetard : Boolean(payload.enRetard),
      payload.montantPenalite === undefined ? existing.montantPenalite : Number(payload.montantPenalite),
      payload.prochainPaiement === undefined ? existing.prochainPaiement : payload.prochainPaiement ? new Date(String(payload.prochainPaiement)) : null,
      payload.dernierPaiement === undefined ? existing.dernierPaiement : payload.dernierPaiement ? new Date(String(payload.dernierPaiement)) : null,
      payload.annee === undefined ? existing.year : Number(payload.annee),
      proprietaire.nom,
      proprietaire.prenom,
      proprietaire.nin,
      proprietaire.telephone,
      conducteur?.nom || proprietaire.nom,
      conducteur?.prenom || proprietaire.prenom,
      conducteur?.nin || proprietaire.nin,
      conducteur?.telephone || proprietaire.telephone
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour moto',
      module: 'Motos',
      details: `Moto ${updated.matricule} mise à jour`,
    });

    return this.mapMotoRow(updated);
  }

  async motosStats(year: number) {
    const [motos, paiements] = await Promise.all([
      prisma.$queryRawUnsafe<Array<Pick<MotoRow, 'enRetard' | 'statut'>>>(
        'SELECT "enRetard", "statut" FROM "MotoRegistration" WHERE "year" = $1',
        year
      ),
      prisma.$queryRawUnsafe<Array<Pick<MotoPaymentRow, 'montant'>>>(
        'SELECT "montant" FROM "MotoPayment" WHERE "year" = $1',
        year
      ),
    ]);
    const totalMotos = motos.length;
    const enRetard = motos.filter((moto) => moto.enRetard).length;
    const recettesMois = paiements.reduce((sum, item) => sum + Number(item.montant || 0), 0);
    const paiementsMois = paiements.length;
    return {
      total: totalMotos,
      totalMotos,
      enRetard,
      paiementsMois,
      recettesMois,
      recettesAnnee: recettesMois,
      tauxPaiement: totalMotos > 0 ? Math.round((paiementsMois / totalMotos) * 100) : 0,
      penalitesEnCours: enRetard * 250,
      montantEnRetard: enRetard * 1250,
    };
  }

  async listMotoPayments(year: number) {
    const rows = await prisma.$queryRawUnsafe<MotoPaymentRow[]>(
      `SELECT
        mp.*,
        m."matricule",
        m."marque",
        m."modele",
        m."annee",
        m."couleur",
        m."proprietaireId",
        m."conducteurId",
        m."permis",
        m."statut" AS "motoStatut",
        m."photo",
        m."enRetard",
        m."montantPenalite",
        m."prochainPaiement",
        m."dernierPaiement",
        p."nom" AS "proprietaireNom",
        p."prenom" AS "proprietairePrenom",
        p."nin" AS "proprietaireNin",
        p."telephone" AS "proprietaireTelephone",
        d."nom" AS "conducteurNom",
        d."prenom" AS "conducteurPrenom",
        d."nin" AS "conducteurNin",
        d."telephone" AS "conducteurTelephone"
      FROM "MotoPayment" mp
      INNER JOIN "MotoRegistration" m ON m."id" = mp."motoId"
      INNER JOIN "Contribuable" p ON p."id" = m."proprietaireId"
      LEFT JOIN "Contribuable" d ON d."id" = m."conducteurId"
      WHERE mp."year" = $1
      ORDER BY COALESCE(mp."datePaiement", mp."createdAt") DESC`,
      year
    );
    return rows.map((row) => this.mapMotoPaymentRow(row));
  }

  async createMotoPayment(req: AuthRequest, actorName: string) {
    const payload = req.body || {};
    const motoId = String(payload.motoId || '').trim();
    if (!motoId) {
      throw new ValidationError('La moto est requise pour enregistrer un paiement.');
    }

    const [moto] = await prisma.$queryRawUnsafe<MotoRow[]>(
      `SELECT
        m.*,
        p."nom" AS "proprietaireNom",
        p."prenom" AS "proprietairePrenom",
        p."nin" AS "proprietaireNin",
        p."telephone" AS "proprietaireTelephone",
        d."nom" AS "conducteurNom",
        d."prenom" AS "conducteurPrenom",
        d."nin" AS "conducteurNin",
        d."telephone" AS "conducteurTelephone"
      FROM "MotoRegistration" m
      INNER JOIN "Contribuable" p ON p."id" = m."proprietaireId"
      LEFT JOIN "Contribuable" d ON d."id" = m."conducteurId"
      WHERE m."id" = $1
      LIMIT 1`,
      motoId
    );
    if (!moto) {
      throw new NotFoundError('Moto introuvable.');
    }

    const montant = payload.montant
      ? Number(payload.montant)
      : moto.enRetard
        ? 1000 + Number(moto.montantPenalite || 250)
        : 1000;
    if (Number.isNaN(montant) || montant <= 0) {
      throw new ValidationError('Le montant du paiement moto est invalide.');
    }

    const paiementDate = new Date();
    const nextDueDate = this.getNextMonthDueDate();
    const [created] = await prisma.$queryRawUnsafe<MotoPaymentRow[]>(
      `INSERT INTO "MotoPayment" ("id", "motoId", "montant", "reference", "statut", "datePaiement", "mois", "numeroRecu", "agent", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'PAYE', $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        "id",
        "motoId",
        "montant",
        "reference",
        "statut",
        "datePaiement",
        "mois",
        "numeroRecu",
        "agent",
        "year",
        "createdAt",
        "updatedAt",
        $10::text AS "matricule",
        $11::text AS "marque",
        $12::text AS "modele",
        $13::integer AS "annee",
        $14::text AS "couleur",
        $15::text AS "proprietaireId",
        $16::text AS "conducteurId",
        $17::text AS "permis",
        $18::text AS "motoStatut",
        $19::text AS "photo",
        false AS "enRetard",
        $20::double precision AS "montantPenalite",
        $21::timestamp AS "prochainPaiement",
        $22::timestamp AS "dernierPaiement",
        $23::text AS "proprietaireNom",
        $24::text AS "proprietairePrenom",
        $25::text AS "proprietaireNin",
        $26::text AS "proprietaireTelephone",
        $27::text AS "conducteurNom",
        $28::text AS "conducteurPrenom",
        $29::text AS "conducteurNin",
        $30::text AS "conducteurTelephone"`,
      randomUUID(),
      motoId,
      montant,
      payload.reference ? String(payload.reference).trim() : null,
      paiementDate,
      payload.mois ? String(payload.mois).trim() : paiementDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      payload.reference ? String(payload.reference).trim() : `MOTO-${Date.now()}`,
      actorName,
      payload.year ? Number(payload.year) : new Date().getFullYear(),
      moto.matricule,
      moto.marque,
      moto.modele,
      moto.annee,
      moto.couleur,
      moto.proprietaireId,
      moto.conducteurId,
      moto.permis,
      moto.statut,
      moto.photo,
      moto.montantPenalite,
      nextDueDate,
      paiementDate,
      moto.proprietaireNom,
      moto.proprietairePrenom,
      moto.proprietaireNin,
      moto.proprietaireTelephone,
      moto.conducteurNom,
      moto.conducteurPrenom,
      moto.conducteurNin,
      moto.conducteurTelephone
    );

    await prisma.$executeRaw`
      UPDATE "MotoRegistration"
      SET "enRetard" = false, "dernierPaiement" = ${paiementDate}, "prochainPaiement" = ${nextDueDate}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${motoId}
    `;

    await this.supportService.writeAuditLog(req, {
      action: 'Paiement moto',
      module: 'Motos',
      details: `Paiement enregistré pour la moto ${moto.matricule} (${montant} FCFA)`,
    });

    return this.mapMotoPaymentRow(created);
  }

  private mapMarketPlaceRow(row: MarketPlaceRow) {
    const occupantName = row.occupantPrenom && row.occupantNom ? `${row.occupantPrenom} ${row.occupantNom}`.trim() : null;
    return {
      id: row.id,
      numeroPlace: row.numeroPlace,
      numero: row.numeroPlace,
      type: row.type,
      zone: row.zone,
      occupantId: row.occupantId,
      occupant: occupantName,
      telephone: row.telephone || row.occupantTelephone,
      dateAttribution: row.dateAttribution ? row.dateAttribution.toISOString() : null,
      activite: row.activite || null,
      tarif: Number(row.tarif || 0),
      periode: row.periode,
      statut: row.statut,
    };
  }

  private mapMarketPaymentRow(row: MarketPaymentRow) {
    return {
      id: row.id,
      placeId: row.placeId,
      montant: Number(row.montant || 0),
      reference: row.reference || undefined,
      periode: row.periode,
      statut: row.statut,
      datePaiement: row.datePaiement ? row.datePaiement.toISOString() : null,
      place: this.mapMarketPlaceRow({
        id: row.placeId,
        numeroPlace: row.numeroPlace,
        type: row.placeType,
        zone: row.placeZone,
        occupantId: row.occupantId,
        activite: row.activite,
        telephone: row.placeTelephone,
        dateAttribution: row.placeDateAttribution,
        tarif: row.tarif,
        periode: row.placePeriode,
        statut: row.placeStatut,
        year: row.year,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        occupantNom: row.occupantNom,
        occupantPrenom: row.occupantPrenom,
        occupantNin: row.occupantNin,
        occupantTelephone: row.occupantTelephone,
      }),
    };
  }

  private mapMotoRow(row: MotoRow) {
    const dernierPaiement = row.dernierPaiement ? row.dernierPaiement.toISOString() : null;
    const prochainPaiement = row.prochainPaiement ? row.prochainPaiement.toISOString() : null;
    const joursRetard =
      row.enRetard && row.prochainPaiement
        ? Math.max(0, Math.floor((Date.now() - row.prochainPaiement.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
    return {
      id: row.id,
      matricule: row.matricule,
      marque: row.marque,
      modele: row.modele,
      annee: row.annee,
      couleur: row.couleur || null,
      proprietaireId: row.proprietaireId,
      conducteurId: row.conducteurId,
      permis: row.permis || null,
      statut: row.statut,
      photo: row.photo || null,
      proprietaire: {
        id: row.proprietaireId,
        nom: row.proprietaireNom,
        prenom: row.proprietairePrenom,
        nin: row.proprietaireNin,
        telephone: row.proprietaireTelephone,
        cni: row.proprietaireNin,
      },
      conducteur: row.conducteurId
        ? {
            id: row.conducteurId,
            nom: row.conducteurNom || row.proprietaireNom,
            prenom: row.conducteurPrenom || row.proprietairePrenom,
            nin: row.conducteurNin || row.proprietaireNin,
            telephone: row.conducteurTelephone || row.proprietaireTelephone,
            cni: row.conducteurNin || row.proprietaireNin,
          }
        : null,
      enRetard: row.enRetard,
      montantPenalite: Number(row.montantPenalite || 0),
      prochainPaiement,
      dernierPaiement,
      joursRetard,
    };
  }

  private mapMotoPaymentRow(row: MotoPaymentRow) {
    return {
      id: row.id,
      motoId: row.motoId,
      montant: Number(row.montant || 0),
      reference: row.reference || undefined,
      statut: row.statut,
      datePaiement: row.datePaiement ? row.datePaiement.toISOString() : null,
      mois: row.mois || undefined,
      numeroRecu: row.numeroRecu || undefined,
      agent: row.agent || 'Agent municipal',
      moto: this.mapMotoRow({
        id: row.motoId,
        matricule: row.matricule,
        marque: row.marque,
        modele: row.modele,
        annee: row.annee,
        couleur: row.couleur,
        proprietaireId: row.proprietaireId,
        conducteurId: row.conducteurId,
        permis: row.permis,
        statut: row.motoStatut,
        photo: row.photo,
        enRetard: row.enRetard,
        montantPenalite: row.montantPenalite,
        prochainPaiement: row.prochainPaiement,
        dernierPaiement: row.dernierPaiement,
        year: row.year,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        proprietaireNom: row.proprietaireNom,
        proprietairePrenom: row.proprietairePrenom,
        proprietaireNin: row.proprietaireNin,
        proprietaireTelephone: row.proprietaireTelephone,
        conducteurNom: row.conducteurNom,
        conducteurPrenom: row.conducteurPrenom,
        conducteurNin: row.conducteurNin,
        conducteurTelephone: row.conducteurTelephone,
      }),
    };
  }

  private normalizeMarketPlaceStatus(status: string) {
    const normalized = status.trim().toUpperCase();
    if (normalized === 'OCCUPEE' || normalized === 'LIBRE' || normalized === 'DISPONIBLE') {
      return normalized === 'DISPONIBLE' ? 'LIBRE' : normalized;
    }
    return 'LIBRE';
  }

  private getNextMonthDueDate() {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next;
  }
}
