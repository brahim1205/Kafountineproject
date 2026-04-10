import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { NotFoundError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';

export type QuaiCollection = 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions';

type FishermanRow = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  nin: string | null;
  adresse: string | null;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  embarcationsCount: number;
  commissionsCount: number;
};

type FishingBoatRow = {
  id: string;
  nom: string;
  immatriculation: string;
  type: string;
  taille: number | null;
  moteur: string | null;
  statut: string;
  pecheurId: string | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  pecheurNom: string | null;
  pecheurPrenom: string | null;
  pecheurTelephone: string | null;
  pecheurNin: string | null;
};

type FishCommissionRow = {
  id: string;
  numero: string;
  poids: number;
  typePoisson: string;
  temperatura: number | null;
  observations: string | null;
  statut: string;
  date: Date;
  pecheurId: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  pecheurNom: string;
  pecheurPrenom: string;
  pecheurTelephone: string | null;
  pecheurNin: string | null;
};

type RefrigeratedTruckRow = {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string | null;
  capacite: number | null;
  chauffeur: string | null;
  telephone: string | null;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  expeditionsCount: number;
};

type ShippingExpeditionRow = {
  id: string;
  numero: string;
  date: Date;
  poids: number;
  destination: string | null;
  montant: number | null;
  statut: string;
  observations: string | null;
  camionId: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  camionImmatriculation: string;
  camionMarque: string;
  camionModele: string | null;
  camionCapacite: number | null;
  camionChauffeur: string | null;
  camionTelephone: string | null;
  camionStatut: string;
};

export class PlaceholderQuaiService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async listCollection(collection: QuaiCollection, year: number) {
    if (collection === 'pecheurs') {
      const rows = await prisma.$queryRawUnsafe<FishermanRow[]>(
        `SELECT
          f.*,
          COALESCE((SELECT COUNT(*) FROM "FishingBoat" b WHERE b."pecheurId" = f."id"), 0)::int AS "embarcationsCount",
          COALESCE((SELECT COUNT(*) FROM "FishCommission" c WHERE c."pecheurId" = f."id"), 0)::int AS "commissionsCount"
        FROM "Fisherman" f
        WHERE f."year" = $1
        ORDER BY f."createdAt" DESC`,
        year
      );
      return rows.map((row) => this.mapFishermanRow(row));
    }
    if (collection === 'embarcations') {
      const rows = await prisma.$queryRawUnsafe<FishingBoatRow[]>(
        `SELECT
          b.*,
          f."nom" AS "pecheurNom",
          f."prenom" AS "pecheurPrenom",
          f."telephone" AS "pecheurTelephone",
          f."nin" AS "pecheurNin"
        FROM "FishingBoat" b
        LEFT JOIN "Fisherman" f ON f."id" = b."pecheurId"
        WHERE b."year" = $1
        ORDER BY b."createdAt" DESC`,
        year
      );
      return rows.map((row) => this.mapFishingBoatRow(row));
    }
    if (collection === 'commissions') {
      const rows = await prisma.$queryRawUnsafe<FishCommissionRow[]>(
        `SELECT
          c.*,
          f."nom" AS "pecheurNom",
          f."prenom" AS "pecheurPrenom",
          f."telephone" AS "pecheurTelephone",
          f."nin" AS "pecheurNin"
        FROM "FishCommission" c
        INNER JOIN "Fisherman" f ON f."id" = c."pecheurId"
        WHERE c."year" = $1
        ORDER BY c."date" DESC`,
        year
      );
      return rows.map((row) => this.mapFishCommissionRow(row));
    }
    if (collection === 'camions') {
      const rows = await prisma.$queryRawUnsafe<RefrigeratedTruckRow[]>(
        `SELECT
          t.*,
          COALESCE((SELECT COUNT(*) FROM "ShippingExpedition" e WHERE e."camionId" = t."id"), 0)::int AS "expeditionsCount"
        FROM "RefrigeratedTruck" t
        WHERE t."year" = $1
        ORDER BY t."createdAt" DESC`,
        year
      );
      return rows.map((row) => this.mapTruckRow(row));
    }
    const rows = await prisma.$queryRawUnsafe<ShippingExpeditionRow[]>(
      `SELECT
        e.*,
        t."immatriculation" AS "camionImmatriculation",
        t."marque" AS "camionMarque",
        t."modele" AS "camionModele",
        t."capacite" AS "camionCapacite",
        t."chauffeur" AS "camionChauffeur",
        t."telephone" AS "camionTelephone",
        t."statut" AS "camionStatut"
      FROM "ShippingExpedition" e
      INNER JOIN "RefrigeratedTruck" t ON t."id" = e."camionId"
      WHERE e."year" = $1
      ORDER BY e."date" DESC`,
      year
    );
    return rows.map((row) => this.mapExpeditionRow(row));
  }

  async getCollectionItem(collection: QuaiCollection, id: string) {
    if (collection === 'pecheurs') {
      const [row] = await prisma.$queryRawUnsafe<FishermanRow[]>(
        `SELECT
          f.*,
          COALESCE((SELECT COUNT(*) FROM "FishingBoat" b WHERE b."pecheurId" = f."id"), 0)::int AS "embarcationsCount",
          COALESCE((SELECT COUNT(*) FROM "FishCommission" c WHERE c."pecheurId" = f."id"), 0)::int AS "commissionsCount"
        FROM "Fisherman" f WHERE f."id" = $1 LIMIT 1`,
        id
      );
      if (!row) throw new NotFoundError('Pêcheur introuvable.');
      return this.mapFishermanRow(row);
    }
    if (collection === 'embarcations') {
      const [row] = await prisma.$queryRawUnsafe<FishingBoatRow[]>(
        `SELECT
          b.*,
          f."nom" AS "pecheurNom",
          f."prenom" AS "pecheurPrenom",
          f."telephone" AS "pecheurTelephone",
          f."nin" AS "pecheurNin"
        FROM "FishingBoat" b
        LEFT JOIN "Fisherman" f ON f."id" = b."pecheurId"
        WHERE b."id" = $1 LIMIT 1`,
        id
      );
      if (!row) throw new NotFoundError('Embarcation introuvable.');
      return this.mapFishingBoatRow(row);
    }
    if (collection === 'commissions') {
      const [row] = await prisma.$queryRawUnsafe<FishCommissionRow[]>(
        `SELECT
          c.*,
          f."nom" AS "pecheurNom",
          f."prenom" AS "pecheurPrenom",
          f."telephone" AS "pecheurTelephone",
          f."nin" AS "pecheurNin"
        FROM "FishCommission" c
        INNER JOIN "Fisherman" f ON f."id" = c."pecheurId"
        WHERE c."id" = $1 LIMIT 1`,
        id
      );
      if (!row) throw new NotFoundError('Commission introuvable.');
      return this.mapFishCommissionRow(row);
    }
    if (collection === 'camions') {
      const [row] = await prisma.$queryRawUnsafe<RefrigeratedTruckRow[]>(
        `SELECT
          t.*,
          COALESCE((SELECT COUNT(*) FROM "ShippingExpedition" e WHERE e."camionId" = t."id"), 0)::int AS "expeditionsCount"
        FROM "RefrigeratedTruck" t WHERE t."id" = $1 LIMIT 1`,
        id
      );
      if (!row) throw new NotFoundError('Camion introuvable.');
      return this.mapTruckRow(row);
    }
    const [row] = await prisma.$queryRawUnsafe<ShippingExpeditionRow[]>(
      `SELECT
        e.*,
        t."immatriculation" AS "camionImmatriculation",
        t."marque" AS "camionMarque",
        t."modele" AS "camionModele",
        t."capacite" AS "camionCapacite",
        t."chauffeur" AS "camionChauffeur",
        t."telephone" AS "camionTelephone",
        t."statut" AS "camionStatut"
      FROM "ShippingExpedition" e
      INNER JOIN "RefrigeratedTruck" t ON t."id" = e."camionId"
      WHERE e."id" = $1 LIMIT 1`,
      id
    );
    if (!row) throw new NotFoundError('Expédition introuvable.');
    return this.mapExpeditionRow(row);
  }

  async getStats(year: number) {
    const [commissions, pecheurs, embarcations] = await Promise.all([
      prisma.$queryRawUnsafe<Array<Pick<FishCommissionRow, 'poids' | 'statut'>>>('SELECT "poids","statut" FROM "FishCommission" WHERE "year" = $1', year),
      prisma.$queryRawUnsafe<Array<Pick<FishermanRow, 'id'>>>('SELECT "id" FROM "Fisherman" WHERE "year" = $1 AND "statut" = $2', year, 'ACTIF'),
      prisma.$queryRawUnsafe<Array<Pick<FishingBoatRow, 'id'>>>('SELECT "id" FROM "FishingBoat" WHERE "year" = $1', year),
    ]);
    return {
      totalCommissions: commissions.length,
      totalPoids: commissions.reduce((sum, item) => sum + Number(item.poids || 0), 0),
      commissionsEnAttente: commissions.filter((item) => item.statut === 'ENREGISTREE').length,
      totalPecheurs: pecheurs.length,
      totalEmbarcations: embarcations.length,
    };
  }

  async createResource(collection: QuaiCollection, req: AuthRequest) {
    const payload = req.body || {};
    const year = payload.year ? Number(payload.year) : new Date().getFullYear();
    if (collection === 'pecheurs') {
      const [row] = await prisma.$queryRawUnsafe<FishermanRow[]>(
        `INSERT INTO "Fisherman" ("id","nom","prenom","telephone","nin","adresse","statut","year","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount"`,
        randomUUID(), String(payload.nom || '').trim(), String(payload.prenom || '').trim(), payload.telephone ? String(payload.telephone).trim() : null, payload.nin ? String(payload.nin).trim() : null, payload.adresse ? String(payload.adresse).trim() : null, String(payload.statut || 'ACTIF').trim().toUpperCase(), year
      );
      await this.supportService.writeAuditLog(req, { action: 'Création pêcheur', module: 'Quai de pêche', details: `Pêcheur ${row.prenom} ${row.nom} créé` });
      return this.mapFishermanRow(row);
    }
    if (collection === 'embarcations') {
      const [owner] = payload.pecheurId ? await prisma.$queryRawUnsafe<FishermanRow[]>(
        `SELECT *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount" FROM "Fisherman" WHERE "id" = $1 LIMIT 1`,
        String(payload.pecheurId)
      ) : [null];
      const [row] = await prisma.$queryRawUnsafe<FishingBoatRow[]>(
        `INSERT INTO "FishingBoat" ("id","nom","immatriculation","type","taille","moteur","statut","pecheurId","year","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING *, $10::text AS "pecheurNom", $11::text AS "pecheurPrenom", $12::text AS "pecheurTelephone", $13::text AS "pecheurNin"`,
        randomUUID(), String(payload.nom || '').trim(), String(payload.immatriculation || '').trim().toUpperCase(), String(payload.type || '').trim(), payload.taille === undefined ? null : Number(payload.taille), payload.moteur ? String(payload.moteur).trim() : null, String(payload.statut || 'ACTIF').trim().toUpperCase(), payload.pecheurId ? String(payload.pecheurId) : null, year, owner?.nom || null, owner?.prenom || null, owner?.telephone || null, owner?.nin || null
      );
      await this.supportService.writeAuditLog(req, { action: 'Création embarcation', module: 'Quai de pêche', details: `Embarcation ${row.immatriculation} créée` });
      return this.mapFishingBoatRow(row);
    }
    if (collection === 'commissions') {
      const [fisherman] = await prisma.$queryRawUnsafe<FishermanRow[]>(
        `SELECT *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount" FROM "Fisherman" WHERE "id" = $1 LIMIT 1`,
        String(payload.pecheurId || '')
      );
      if (!fisherman) throw new NotFoundError('Pêcheur introuvable.');
      const numero = `CF-${year}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      const [row] = await prisma.$queryRawUnsafe<FishCommissionRow[]>(
        `INSERT INTO "FishCommission" ("id","numero","poids","typePoisson","temperatura","observations","statut","date","pecheurId","year","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,'ENREGISTREE',CURRENT_TIMESTAMP,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING *, $9::text AS "pecheurNom", $10::text AS "pecheurPrenom", $11::text AS "pecheurTelephone", $12::text AS "pecheurNin"`,
        randomUUID(), numero, Number(payload.poids || 0), String(payload.typePoisson || '').trim(), payload.temperatura === undefined ? null : Number(payload.temperatura), payload.observations ? String(payload.observations).trim() : null, fisherman.id, year, fisherman.nom, fisherman.prenom, fisherman.telephone, fisherman.nin
      );
      await this.supportService.writeAuditLog(req, { action: 'Création commission', module: 'Quai de pêche', details: `Commission ${row.numero} créée` });
      return this.mapFishCommissionRow(row);
    }
    if (collection === 'camions') {
      const [row] = await prisma.$queryRawUnsafe<RefrigeratedTruckRow[]>(
        `INSERT INTO "RefrigeratedTruck" ("id","immatriculation","marque","modele","capacite","chauffeur","telephone","statut","year","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING *, 0::int AS "expeditionsCount"`,
        randomUUID(), String(payload.immatriculation || '').trim().toUpperCase(), String(payload.marque || '').trim(), payload.modele ? String(payload.modele).trim() : null, payload.capacite === undefined ? null : Number(payload.capacite), payload.chauffeur ? String(payload.chauffeur).trim() : null, payload.telephone ? String(payload.telephone).trim() : null, String(payload.statut || 'ACTIF').trim().toUpperCase(), year
      );
      await this.supportService.writeAuditLog(req, { action: 'Création camion frigorifique', module: 'Quai de pêche', details: `Camion ${row.immatriculation} créé` });
      return this.mapTruckRow(row);
    }
    const [truck] = await prisma.$queryRawUnsafe<RefrigeratedTruckRow[]>(
      `SELECT *, 0::int AS "expeditionsCount" FROM "RefrigeratedTruck" WHERE "id" = $1 LIMIT 1`,
      String(payload.camionId || '')
    );
    if (!truck) throw new NotFoundError('Camion introuvable.');
    const numero = `EXP-${year}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const [row] = await prisma.$queryRawUnsafe<ShippingExpeditionRow[]>(
      `INSERT INTO "ShippingExpedition" ("id","numero","date","poids","destination","montant","statut","observations","camionId","year","createdAt","updatedAt")
       VALUES ($1,$2,CURRENT_TIMESTAMP,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, $10::text AS "camionImmatriculation", $11::text AS "camionMarque", $12::text AS "camionModele", $13::double precision AS "camionCapacite", $14::text AS "camionChauffeur", $15::text AS "camionTelephone", $16::text AS "camionStatut"`,
      randomUUID(), numero, Number(payload.poids || 0), payload.destination ? String(payload.destination).trim() : null, payload.montant === undefined ? null : Number(payload.montant), String(payload.statut || 'PLANIFIEE').trim().toUpperCase(), payload.observations ? String(payload.observations).trim() : null, truck.id, year, truck.immatriculation, truck.marque, truck.modele, truck.capacite, truck.chauffeur, truck.telephone, truck.statut
    );
    await this.supportService.writeAuditLog(req, { action: 'Création expédition', module: 'Quai de pêche', details: `Expédition ${row.numero} créée` });
    return this.mapExpeditionRow(row);
  }

  async updateResource(collection: QuaiCollection, req: AuthRequest) {
    const id = String(req.params.id);
    const payload = req.body || {};
    if (collection === 'pecheurs') {
      const [row] = await prisma.$queryRawUnsafe<FishermanRow[]>(
        `UPDATE "Fisherman" SET "nom"=$2,"prenom"=$3,"telephone"=$4,"nin"=$5,"adresse"=$6,"statut"=$7,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 RETURNING *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount"`,
        id, String(payload.nom || '').trim(), String(payload.prenom || '').trim(), payload.telephone ? String(payload.telephone).trim() : null, payload.nin ? String(payload.nin).trim() : null, payload.adresse ? String(payload.adresse).trim() : null, String(payload.statut || 'ACTIF').trim().toUpperCase()
      );
      await this.supportService.writeAuditLog(req, { action: 'Mise à jour pêcheur', module: 'Quai de pêche', details: `Pêcheur ${row.prenom} ${row.nom} mis à jour` });
      return this.mapFishermanRow(row);
    }
    if (collection === 'embarcations') {
      const [owner] = payload.pecheurId ? await prisma.$queryRawUnsafe<FishermanRow[]>(
        `SELECT *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount" FROM "Fisherman" WHERE "id" = $1 LIMIT 1`,
        String(payload.pecheurId)
      ) : [null];
      const [row] = await prisma.$queryRawUnsafe<FishingBoatRow[]>(
        `UPDATE "FishingBoat" SET "nom"=$2,"immatriculation"=$3,"type"=$4,"taille"=$5,"moteur"=$6,"statut"=$7,"pecheurId"=$8,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1
         RETURNING *, $9::text AS "pecheurNom", $10::text AS "pecheurPrenom", $11::text AS "pecheurTelephone", $12::text AS "pecheurNin"`,
        id, String(payload.nom || '').trim(), String(payload.immatriculation || '').trim().toUpperCase(), String(payload.type || '').trim(), payload.taille === undefined ? null : Number(payload.taille), payload.moteur ? String(payload.moteur).trim() : null, String(payload.statut || 'ACTIF').trim().toUpperCase(), payload.pecheurId ? String(payload.pecheurId) : null, owner?.nom || null, owner?.prenom || null, owner?.telephone || null, owner?.nin || null
      );
      await this.supportService.writeAuditLog(req, { action: 'Mise à jour embarcation', module: 'Quai de pêche', details: `Embarcation ${row.immatriculation} mise à jour` });
      return this.mapFishingBoatRow(row);
    }
    if (collection === 'commissions') {
      const [current] = await prisma.$queryRawUnsafe<FishCommissionRow[]>(
        `SELECT c.*, f."nom" AS "pecheurNom", f."prenom" AS "pecheurPrenom", f."telephone" AS "pecheurTelephone", f."nin" AS "pecheurNin"
         FROM "FishCommission" c INNER JOIN "Fisherman" f ON f."id" = c."pecheurId" WHERE c."id" = $1 LIMIT 1`,
        id
      );
      const [row] = await prisma.$queryRawUnsafe<FishCommissionRow[]>(
        `UPDATE "FishCommission" SET "poids"=$2,"typePoisson"=$3,"temperatura"=$4,"observations"=$5,"statut"=$6,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1
         RETURNING *, $7::text AS "pecheurNom", $8::text AS "pecheurPrenom", $9::text AS "pecheurTelephone", $10::text AS "pecheurNin"`,
        id, payload.poids === undefined ? current.poids : Number(payload.poids), payload.typePoisson ? String(payload.typePoisson).trim() : current.typePoisson, payload.temperatura === undefined ? current.temperatura : Number(payload.temperatura), payload.observations === undefined ? current.observations : String(payload.observations || '').trim() || null, payload.statut ? String(payload.statut).trim().toUpperCase() : current.statut, current.pecheurNom, current.pecheurPrenom, current.pecheurTelephone, current.pecheurNin
      );
      await this.supportService.writeAuditLog(req, { action: 'Mise à jour commission', module: 'Quai de pêche', details: `Commission ${row.numero} mise à jour` });
      return this.mapFishCommissionRow(row);
    }
    if (collection === 'camions') {
      const [row] = await prisma.$queryRawUnsafe<RefrigeratedTruckRow[]>(
        `UPDATE "RefrigeratedTruck" SET "immatriculation"=$2,"marque"=$3,"modele"=$4,"capacite"=$5,"chauffeur"=$6,"telephone"=$7,"statut"=$8,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 RETURNING *, 0::int AS "expeditionsCount"`,
        id, String(payload.immatriculation || '').trim().toUpperCase(), String(payload.marque || '').trim(), payload.modele ? String(payload.modele).trim() : null, payload.capacite === undefined ? null : Number(payload.capacite), payload.chauffeur ? String(payload.chauffeur).trim() : null, payload.telephone ? String(payload.telephone).trim() : null, String(payload.statut || 'ACTIF').trim().toUpperCase()
      );
      await this.supportService.writeAuditLog(req, { action: 'Mise à jour camion', module: 'Quai de pêche', details: `Camion ${row.immatriculation} mis à jour` });
      return this.mapTruckRow(row);
    }
    const [current] = await prisma.$queryRawUnsafe<ShippingExpeditionRow[]>(
      `SELECT e.*, t."immatriculation" AS "camionImmatriculation", t."marque" AS "camionMarque", t."modele" AS "camionModele", t."capacite" AS "camionCapacite", t."chauffeur" AS "camionChauffeur", t."telephone" AS "camionTelephone", t."statut" AS "camionStatut" FROM "ShippingExpedition" e INNER JOIN "RefrigeratedTruck" t ON t."id" = e."camionId" WHERE e."id" = $1 LIMIT 1`,
      id
    );
    const [row] = await prisma.$queryRawUnsafe<ShippingExpeditionRow[]>(
      `UPDATE "ShippingExpedition" SET "poids"=$2,"destination"=$3,"montant"=$4,"statut"=$5,"observations"=$6,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1
       RETURNING *, $7::text AS "camionImmatriculation", $8::text AS "camionMarque", $9::text AS "camionModele", $10::double precision AS "camionCapacite", $11::text AS "camionChauffeur", $12::text AS "camionTelephone", $13::text AS "camionStatut"`,
      id, payload.poids === undefined ? current.poids : Number(payload.poids), payload.destination === undefined ? current.destination : String(payload.destination || '').trim() || null, payload.montant === undefined ? current.montant : Number(payload.montant), payload.statut ? String(payload.statut).trim().toUpperCase() : current.statut, payload.observations === undefined ? current.observations : String(payload.observations || '').trim() || null, current.camionImmatriculation, current.camionMarque, current.camionModele, current.camionCapacite, current.camionChauffeur, current.camionTelephone, current.camionStatut
    );
    await this.supportService.writeAuditLog(req, { action: 'Mise à jour expédition', module: 'Quai de pêche', details: `Expédition ${row.numero} mise à jour` });
    return this.mapExpeditionRow(row);
  }

  async deleteResource(collection: QuaiCollection, req: AuthRequest) {
    const id = String(req.params.id);
    if (collection === 'pecheurs') {
      await prisma.$executeRaw`DELETE FROM "Fisherman" WHERE "id" = ${id}`;
    } else if (collection === 'embarcations') {
      await prisma.$executeRaw`DELETE FROM "FishingBoat" WHERE "id" = ${id}`;
    } else if (collection === 'commissions') {
      await prisma.$executeRaw`DELETE FROM "FishCommission" WHERE "id" = ${id}`;
    } else if (collection === 'camions') {
      await prisma.$executeRaw`DELETE FROM "RefrigeratedTruck" WHERE "id" = ${id}`;
    } else {
      await prisma.$executeRaw`DELETE FROM "ShippingExpedition" WHERE "id" = ${id}`;
    }
    await this.supportService.writeAuditLog(req, { action: 'Suppression ressource quai', module: 'Quai de pêche', details: `${collection} ${id} supprimé`, status: 'warning' });
  }

  private mapFishermanRow(row: FishermanRow) {
    return {
      id: row.id,
      nom: row.nom,
      prenom: row.prenom,
      telephone: row.telephone || undefined,
      nin: row.nin || undefined,
      adresse: row.adresse || undefined,
      statut: row.statut,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      embarcations: Array.from({ length: Number(row.embarcationsCount || 0) }).map((_, index) => ({ id: `${row.id}-boat-${index}` })),
      _count: { commissions: Number(row.commissionsCount || 0) },
    };
  }

  private mapFishingBoatRow(row: FishingBoatRow) {
    return {
      id: row.id,
      nom: row.nom,
      immatriculation: row.immatriculation,
      type: row.type,
      taille: row.taille === null ? undefined : Number(row.taille),
      moteur: row.moteur || undefined,
      statut: row.statut,
      pecheurId: row.pecheurId || undefined,
      pecheur: row.pecheurId
        ? {
            id: row.pecheurId,
            nom: row.pecheurNom || '',
            prenom: row.pecheurPrenom || '',
            telephone: row.pecheurTelephone || undefined,
            nin: row.pecheurNin || undefined,
            statut: 'ACTIF',
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          }
        : undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapFishCommissionRow(row: FishCommissionRow) {
    return {
      id: row.id,
      numero: row.numero,
      poids: Number(row.poids || 0),
      typePoisson: row.typePoisson,
      temperatura: row.temperatura === null ? undefined : Number(row.temperatura),
      observations: row.observations || undefined,
      statut: row.statut,
      date: row.date.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      pecheurId: row.pecheurId,
      pecheur: {
        id: row.pecheurId,
        nom: row.pecheurNom,
        prenom: row.pecheurPrenom,
        telephone: row.pecheurTelephone || undefined,
        nin: row.pecheurNin || undefined,
        statut: 'ACTIF',
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  }

  private mapTruckRow(row: RefrigeratedTruckRow) {
    return {
      id: row.id,
      immatriculation: row.immatriculation,
      marque: row.marque,
      modele: row.modele || undefined,
      capacite: row.capacite === null ? undefined : Number(row.capacite),
      chauffeur: row.chauffeur || undefined,
      telephone: row.telephone || undefined,
      statut: row.statut,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      _count: { expeditions: Number(row.expeditionsCount || 0) },
    };
  }

  private mapExpeditionRow(row: ShippingExpeditionRow) {
    return {
      id: row.id,
      numero: row.numero,
      date: row.date.toISOString(),
      poids: Number(row.poids || 0),
      destination: row.destination || undefined,
      montant: row.montant === null ? undefined : Number(row.montant),
      statut: row.statut,
      observations: row.observations || undefined,
      camionId: row.camionId,
      camion: {
        id: row.camionId,
        immatriculation: row.camionImmatriculation,
        marque: row.camionMarque,
        modele: row.camionModele || undefined,
        capacite: row.camionCapacite === null ? undefined : Number(row.camionCapacite),
        chauffeur: row.camionChauffeur || undefined,
        telephone: row.camionTelephone || undefined,
        statut: row.camionStatut,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
