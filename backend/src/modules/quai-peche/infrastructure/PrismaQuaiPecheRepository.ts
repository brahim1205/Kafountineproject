import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type {
  ExpeditionValues,
  FishCommission,
  FishCommissionValues,
  Fisherman,
  FishermanValues,
  FishingBoat,
  FishingBoatValues,
  QuaiCollection,
  QuaiPecheRepository,
  RefrigeratedTruck,
  ShippingExpedition,
  TruckValues,
} from '../domain/QuaiPeche';

const SELECT_FISHERMAN = `SELECT
          f.*,
          COALESCE((SELECT COUNT(*) FROM "FishingBoat" b WHERE b."pecheurId" = f."id"), 0)::int AS "embarcationsCount",
          COALESCE((SELECT COUNT(*) FROM "FishCommission" c WHERE c."pecheurId" = f."id"), 0)::int AS "commissionsCount"
        FROM "Fisherman" f`;

const SELECT_BOAT = `SELECT
          b.*,
          f."nom" AS "pecheurNom",
          f."prenom" AS "pecheurPrenom",
          f."telephone" AS "pecheurTelephone",
          f."nin" AS "pecheurNin"
        FROM "FishingBoat" b
        LEFT JOIN "Fisherman" f ON f."id" = b."pecheurId"`;

const SELECT_COMMISSION = `SELECT
          c.*,
          f."nom" AS "pecheurNom",
          f."prenom" AS "pecheurPrenom",
          f."telephone" AS "pecheurTelephone",
          f."nin" AS "pecheurNin"
        FROM "FishCommission" c
        INNER JOIN "Fisherman" f ON f."id" = c."pecheurId"`;

const SELECT_TRUCK = `SELECT
          t.*,
          COALESCE((SELECT COUNT(*) FROM "ShippingExpedition" e WHERE e."camionId" = t."id"), 0)::int AS "expeditionsCount"
        FROM "RefrigeratedTruck" t`;

const SELECT_EXPEDITION = `SELECT
        e.*,
        t."immatriculation" AS "camionImmatriculation",
        t."marque" AS "camionMarque",
        t."modele" AS "camionModele",
        t."capacite" AS "camionCapacite",
        t."chauffeur" AS "camionChauffeur",
        t."telephone" AS "camionTelephone",
        t."statut" AS "camionStatut"
      FROM "ShippingExpedition" e
      INNER JOIN "RefrigeratedTruck" t ON t."id" = e."camionId"`;

const TABLES: Record<QuaiCollection, string> = {
  pecheurs: 'Fisherman',
  embarcations: 'FishingBoat',
  commissions: 'FishCommission',
  camions: 'RefrigeratedTruck',
  expeditions: 'ShippingExpedition',
};

async function first<T>(rows: Promise<T[]>) {
  const [row] = await rows;
  return row || null;
}

export class PrismaQuaiPecheRepository implements QuaiPecheRepository {
  listFishermen(year: number) {
    return prisma.$queryRawUnsafe<Fisherman[]>(`${SELECT_FISHERMAN} WHERE f."year" = $1 ORDER BY f."createdAt" DESC`, year);
  }

  findFisherman(id: string) {
    return first(prisma.$queryRawUnsafe<Fisherman[]>(`${SELECT_FISHERMAN} WHERE f."id" = $1 LIMIT 1`, id));
  }

  async createFisherman(values: FishermanValues & { year: number }) {
    const [row] = await prisma.$queryRawUnsafe<Fisherman[]>(
      `INSERT INTO "Fisherman" ("id","nom","prenom","telephone","nin","adresse","statut","year","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount"`,
      randomUUID(), values.nom, values.prenom, values.telephone, values.nin, values.adresse, values.statut, values.year
    );
    return row;
  }

  async updateFisherman(id: string, values: FishermanValues) {
    const [row] = await prisma.$queryRawUnsafe<Fisherman[]>(
      `UPDATE "Fisherman" SET "nom"=$2,"prenom"=$3,"telephone"=$4,"nin"=$5,"adresse"=$6,"statut"=$7,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 RETURNING *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount"`,
      id, values.nom, values.prenom, values.telephone, values.nin, values.adresse, values.statut
    );
    return row;
  }

  listBoats(year: number) {
    return prisma.$queryRawUnsafe<FishingBoat[]>(`${SELECT_BOAT} WHERE b."year" = $1 ORDER BY b."createdAt" DESC`, year);
  }

  findBoat(id: string) {
    return first(prisma.$queryRawUnsafe<FishingBoat[]>(`${SELECT_BOAT} WHERE b."id" = $1 LIMIT 1`, id));
  }

  async createBoat(values: FishingBoatValues & { year: number }, owner: Fisherman | null) {
    const [row] = await prisma.$queryRawUnsafe<FishingBoat[]>(
      `INSERT INTO "FishingBoat" ("id","nom","immatriculation","type","taille","moteur","statut","pecheurId","year","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, $10::text AS "pecheurNom", $11::text AS "pecheurPrenom", $12::text AS "pecheurTelephone", $13::text AS "pecheurNin"`,
      randomUUID(), values.nom, values.immatriculation, values.type, values.taille, values.moteur, values.statut, values.pecheurId, values.year,
      owner?.nom || null, owner?.prenom || null, owner?.telephone || null, owner?.nin || null
    );
    return row;
  }

  async updateBoat(id: string, values: FishingBoatValues, owner: Fisherman | null) {
    const [row] = await prisma.$queryRawUnsafe<FishingBoat[]>(
      `UPDATE "FishingBoat" SET "nom"=$2,"immatriculation"=$3,"type"=$4,"taille"=$5,"moteur"=$6,"statut"=$7,"pecheurId"=$8,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1
       RETURNING *, $9::text AS "pecheurNom", $10::text AS "pecheurPrenom", $11::text AS "pecheurTelephone", $12::text AS "pecheurNin"`,
      id, values.nom, values.immatriculation, values.type, values.taille, values.moteur, values.statut, values.pecheurId,
      owner?.nom || null, owner?.prenom || null, owner?.telephone || null, owner?.nin || null
    );
    return row;
  }

  listCommissions(year: number) {
    return prisma.$queryRawUnsafe<FishCommission[]>(`${SELECT_COMMISSION} WHERE c."year" = $1 ORDER BY c."date" DESC`, year);
  }

  findCommission(id: string) {
    return first(prisma.$queryRawUnsafe<FishCommission[]>(`${SELECT_COMMISSION} WHERE c."id" = $1 LIMIT 1`, id));
  }

  async createCommission(
    values: Omit<FishCommissionValues, 'statut'> & { numero: string; year: number },
    fisherman: Fisherman
  ) {
    const [row] = await prisma.$queryRawUnsafe<FishCommission[]>(
      `INSERT INTO "FishCommission" ("id","numero","poids","typePoisson","temperatura","observations","statut","date","pecheurId","year","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,'ENREGISTREE',CURRENT_TIMESTAMP,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, $9::text AS "pecheurNom", $10::text AS "pecheurPrenom", $11::text AS "pecheurTelephone", $12::text AS "pecheurNin"`,
      randomUUID(), values.numero, values.poids, values.typePoisson, values.temperatura, values.observations, fisherman.id, values.year,
      fisherman.nom, fisherman.prenom, fisherman.telephone, fisherman.nin
    );
    return row;
  }

  async updateCommission(id: string, values: FishCommissionValues, current: FishCommission) {
    const [row] = await prisma.$queryRawUnsafe<FishCommission[]>(
      `UPDATE "FishCommission" SET "poids"=$2,"typePoisson"=$3,"temperatura"=$4,"observations"=$5,"statut"=$6,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1
       RETURNING *, $7::text AS "pecheurNom", $8::text AS "pecheurPrenom", $9::text AS "pecheurTelephone", $10::text AS "pecheurNin"`,
      id, values.poids, values.typePoisson, values.temperatura, values.observations, values.statut,
      current.pecheurNom, current.pecheurPrenom, current.pecheurTelephone, current.pecheurNin
    );
    return row;
  }

  listTrucks(year: number) {
    return prisma.$queryRawUnsafe<RefrigeratedTruck[]>(`${SELECT_TRUCK} WHERE t."year" = $1 ORDER BY t."createdAt" DESC`, year);
  }

  findTruck(id: string) {
    return first(prisma.$queryRawUnsafe<RefrigeratedTruck[]>(`${SELECT_TRUCK} WHERE t."id" = $1 LIMIT 1`, id));
  }

  async createTruck(values: TruckValues & { year: number }) {
    const [row] = await prisma.$queryRawUnsafe<RefrigeratedTruck[]>(
      `INSERT INTO "RefrigeratedTruck" ("id","immatriculation","marque","modele","capacite","chauffeur","telephone","statut","year","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, 0::int AS "expeditionsCount"`,
      randomUUID(), values.immatriculation, values.marque, values.modele, values.capacite, values.chauffeur, values.telephone, values.statut, values.year
    );
    return row;
  }

  async updateTruck(id: string, values: TruckValues) {
    const [row] = await prisma.$queryRawUnsafe<RefrigeratedTruck[]>(
      `UPDATE "RefrigeratedTruck" SET "immatriculation"=$2,"marque"=$3,"modele"=$4,"capacite"=$5,"chauffeur"=$6,"telephone"=$7,"statut"=$8,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 RETURNING *, 0::int AS "expeditionsCount"`,
      id, values.immatriculation, values.marque, values.modele, values.capacite, values.chauffeur, values.telephone, values.statut
    );
    return row;
  }

  listExpeditions(year: number) {
    return prisma.$queryRawUnsafe<ShippingExpedition[]>(`${SELECT_EXPEDITION} WHERE e."year" = $1 ORDER BY e."date" DESC`, year);
  }

  findExpedition(id: string) {
    return first(prisma.$queryRawUnsafe<ShippingExpedition[]>(`${SELECT_EXPEDITION} WHERE e."id" = $1 LIMIT 1`, id));
  }

  async createExpedition(values: ExpeditionValues & { numero: string; year: number }, truck: RefrigeratedTruck) {
    const [row] = await prisma.$queryRawUnsafe<ShippingExpedition[]>(
      `INSERT INTO "ShippingExpedition" ("id","numero","date","poids","destination","montant","statut","observations","camionId","year","createdAt","updatedAt")
       VALUES ($1,$2,CURRENT_TIMESTAMP,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, $10::text AS "camionImmatriculation", $11::text AS "camionMarque", $12::text AS "camionModele", $13::double precision AS "camionCapacite", $14::text AS "camionChauffeur", $15::text AS "camionTelephone", $16::text AS "camionStatut"`,
      randomUUID(), values.numero, values.poids, values.destination, values.montant, values.statut, values.observations, truck.id, values.year,
      truck.immatriculation, truck.marque, truck.modele, truck.capacite, truck.chauffeur, truck.telephone, truck.statut
    );
    return row;
  }

  async updateExpedition(id: string, values: ExpeditionValues, current: ShippingExpedition) {
    const [row] = await prisma.$queryRawUnsafe<ShippingExpedition[]>(
      `UPDATE "ShippingExpedition" SET "poids"=$2,"destination"=$3,"montant"=$4,"statut"=$5,"observations"=$6,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1
       RETURNING *, $7::text AS "camionImmatriculation", $8::text AS "camionMarque", $9::text AS "camionModele", $10::double precision AS "camionCapacite", $11::text AS "camionChauffeur", $12::text AS "camionTelephone", $13::text AS "camionStatut"`,
      id, values.poids, values.destination, values.montant, values.statut, values.observations,
      current.camionImmatriculation, current.camionMarque, current.camionModele, current.camionCapacite, current.camionChauffeur, current.camionTelephone, current.camionStatut
    );
    return row;
  }

  async delete(collection: QuaiCollection, id: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${TABLES[collection]}" WHERE "id" = $1`, id);
  }

  listCommissionWeights(year: number) {
    return prisma.$queryRawUnsafe<Array<Pick<FishCommission, 'poids' | 'statut'>>>(
      'SELECT "poids","statut" FROM "FishCommission" WHERE "year" = $1',
      year
    );
  }

  async countActiveFishermen(year: number) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "Fisherman" WHERE "year" = $1 AND "statut" = $2',
      year,
      'ACTIF'
    );
    return rows.length;
  }

  async countBoats(year: number) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "FishingBoat" WHERE "year" = $1', year);
    return rows.length;
  }
}
