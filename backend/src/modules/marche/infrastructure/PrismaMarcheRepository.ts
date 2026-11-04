import { randomUUID } from 'node:crypto';
import { db } from '../../../shared/infrastructure/prisma/transactionContext';
import type { MarcheRepository, MarketPayment, MarketPlace, MarketPlaceValues, OccupantDisplay } from '../domain/Marche';

const SELECT_PLACE = `SELECT
        p.*,
        c."nom" AS "occupantNom",
        c."prenom" AS "occupantPrenom",
        c."nin" AS "occupantNin",
        c."telephone" AS "occupantTelephone"
      FROM "MarketPlace" p
      LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"`;

const PLACE_RETURNING = `"id",
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
        $16::text AS "occupantTelephone"`;

const SQL_LIST_PLACES = `${SELECT_PLACE}
      WHERE p."year" = $1
      ORDER BY p."numeroPlace" ASC`;
const SQL_FIND_PLACE_BY_ID = `${SELECT_PLACE}
      WHERE p."id" = $1
      LIMIT 1`;
const SQL_CREATE_PLACE = `INSERT INTO "MarketPlace" ("id", "numeroPlace", "type", "zone", "occupantId", "activite", "telephone", "dateAttribution", "tarif", "periode", "statut", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        ${PLACE_RETURNING}`;
const SQL_UPDATE_PLACE = `UPDATE "MarketPlace"
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
        ${PLACE_RETURNING}`;

export class PrismaMarcheRepository implements MarcheRepository {
  listPlaces(year: number) {
    return db().$queryRawUnsafe<MarketPlace[]>(
      SQL_LIST_PLACES,
      year
    );
  }

  async findPlaceById(id: string) {
    const [row] = await db().$queryRawUnsafe<MarketPlace[]>(
      SQL_FIND_PLACE_BY_ID,
      id
    );
    return row || null;
  }

  async findPlaceIdByNumero(numeroPlace: string, year: number) {
    const [row] = await db().$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "MarketPlace" WHERE "numeroPlace" = $1 AND "year" = $2 LIMIT 1',
      numeroPlace,
      year
    );
    return row?.id || null;
  }

  async createPlace(values: MarketPlaceValues, occupant: OccupantDisplay) {
    const [row] = await db().$queryRawUnsafe<MarketPlace[]>(
      SQL_CREATE_PLACE,
      randomUUID(),
      values.numeroPlace,
      values.type,
      values.zone,
      values.occupantId,
      values.activite,
      values.telephone,
      values.dateAttribution,
      values.tarif,
      values.periode,
      values.statut,
      values.year,
      occupant.occupantNom,
      occupant.occupantPrenom,
      occupant.occupantNin,
      occupant.occupantTelephone
    );
    return row;
  }

  async updatePlace(id: string, values: MarketPlaceValues, occupant: OccupantDisplay) {
    const [row] = await db().$queryRawUnsafe<MarketPlace[]>(
      SQL_UPDATE_PLACE,
      id,
      values.numeroPlace,
      values.type,
      values.zone,
      values.occupantId,
      values.activite,
      values.telephone,
      values.dateAttribution,
      values.tarif,
      values.periode,
      values.statut,
      values.year,
      occupant.occupantNom,
      occupant.occupantPrenom,
      occupant.occupantNin,
      occupant.occupantTelephone
    );
    return row;
  }

  listPayments(year: number) {
    return db().$queryRawUnsafe<MarketPayment[]>(
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
  }

  async createPayment(
    values: Pick<MarketPayment, 'placeId' | 'montant' | 'reference' | 'periode' | 'statut' | 'year'> & { datePaiement: Date },
    place: MarketPlace
  ) {
    const [row] = await db().$queryRawUnsafe<MarketPayment[]>(
      `INSERT INTO "MarketPayment" ("id", "placeId", "montant", "reference", "periode", "statut", "datePaiement", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $21, $22, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      values.placeId,
      values.montant,
      values.reference,
      values.periode,
      values.year,
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
      place.occupantTelephone,
      values.statut,
      values.datePaiement
    );
    return row;
  }

  listPlacesForStats(year: number) {
    return db().$queryRawUnsafe<Array<Pick<MarketPlace, 'statut' | 'occupantId'>>>(
      'SELECT "statut", "occupantId" FROM "MarketPlace" WHERE "year" = $1',
      year
    );
  }

  listPaymentsForStats(year: number) {
    return db().$queryRawUnsafe<Array<Pick<MarketPayment, 'montant' | 'statut'>>>(
      'SELECT "montant", "statut" FROM "MarketPayment" WHERE "year" = $1',
      year
    );
  }
}
