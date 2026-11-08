import { randomUUID } from 'node:crypto';
import { db, inTransaction } from '../../../shared/infrastructure/prisma/transactionContext';
import type {
  MotoPayment,
  MotoPaymentValues,
  MotoPeopleDisplay,
  MotoRegistration,
  MotoRepository,
  MotoValues,
} from '../domain/Moto';

const SELECT_MOTO = `SELECT
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
      LEFT JOIN "Contribuable" d ON d."id" = m."conducteurId"`;

const MOTO_RETURNING = `"id",
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
        "updatedAt"`;

const SQL_LIST = `${SELECT_MOTO}
      WHERE m."year" = $1
      ORDER BY m."createdAt" DESC`;
const SQL_FIND_BY_ID = `${SELECT_MOTO}
      WHERE m."id" = $1
      LIMIT 1`;
const SQL_CREATE = `INSERT INTO "MotoRegistration" ("id", "matricule", "marque", "modele", "annee", "couleur", "proprietaireId", "conducteurId", "permis", "statut", "photo", "enRetard", "montantPenalite", "prochainPaiement", "dernierPaiement", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        ${MOTO_RETURNING},
        $17::text AS "proprietaireNom",
        $18::text AS "proprietairePrenom",
        $19::text AS "proprietaireNin",
        $20::text AS "proprietaireTelephone",
        $21::text AS "conducteurNom",
        $22::text AS "conducteurPrenom",
        $23::text AS "conducteurNin",
        $24::text AS "conducteurTelephone"`;
const SQL_UPDATE = `UPDATE "MotoRegistration"
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
        ${MOTO_RETURNING},
        $17::text AS "proprietaireNom",
        $18::text AS "proprietairePrenom",
        $19::text AS "proprietaireNin",
        $20::text AS "proprietaireTelephone",
        $21::text AS "conducteurNom",
        $22::text AS "conducteurPrenom",
        $23::text AS "conducteurNin",
        $24::text AS "conducteurTelephone"`;

export class PrismaMotoRepository implements MotoRepository {
  list(year: number) {
    return db().$queryRawUnsafe<MotoRegistration[]>(
      SQL_LIST,
      year
    );
  }

  async findById(id: string) {
    const [row] = await db().$queryRawUnsafe<MotoRegistration[]>(
      SQL_FIND_BY_ID,
      id
    );
    return row || null;
  }

  async findIdByMatricule(matricule: string) {
    const [row] = await db().$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "MotoRegistration" WHERE "matricule" = $1 LIMIT 1',
      matricule
    );
    return row?.id || null;
  }

  async findIdByPermis(permis: string) {
    const [row] = await db().$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "MotoRegistration" WHERE "permis" = $1 LIMIT 1',
      permis
    );
    return row?.id || null;
  }

  async create(values: MotoValues, people: MotoPeopleDisplay) {
    const [row] = await db().$queryRawUnsafe<MotoRegistration[]>(
      SQL_CREATE,
      randomUUID(),
      ...this.valueParams(values),
      ...this.peopleParams(people)
    );
    return row;
  }

  async update(id: string, values: MotoValues, people: MotoPeopleDisplay) {
    const [row] = await db().$queryRawUnsafe<MotoRegistration[]>(
      SQL_UPDATE,
      id,
      ...this.valueParams(values),
      ...this.peopleParams(people)
    );
    return row;
  }

  listForStats(year: number) {
    return db().$queryRawUnsafe<Array<Pick<MotoRegistration, 'enRetard' | 'statut' | 'prochainPaiement'>>>(
      'SELECT "enRetard", "statut", "prochainPaiement" FROM "MotoRegistration" WHERE "year" = $1',
      year
    );
  }

  listPaymentAmounts(year: number) {
    return db().$queryRawUnsafe<Array<Pick<MotoPayment, 'montant'>>>(
      'SELECT "montant" FROM "MotoPayment" WHERE "year" = $1',
      year
    );
  }

  listPayments(year: number) {
    return db().$queryRawUnsafe<MotoPayment[]>(
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
  }

  recordPayment(values: MotoPaymentValues, moto: MotoRegistration) {
    // Seule la cotisation fait avancer l'échéance : adhésion et amende sont des paiements à part.
    const cotisation = values.type === 'COTISATION';
    return inTransaction(async (tx) => {
      const [row] = await tx.$queryRawUnsafe<MotoPayment[]>(
      `INSERT INTO "MotoPayment" ("id", "motoId", "type", "montant", "reference", "statut", "datePaiement", "mois", "numeroRecu", "agent", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $31, $3, $4, 'PAYE', $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        "id",
        "motoId",
        "type",
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
        $32::boolean AS "enRetard",
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
      values.motoId,
      values.montant,
      values.reference,
      values.datePaiement,
      values.mois,
      values.numeroRecu,
      values.agent,
      values.year,
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
      values.prochainPaiement,
      cotisation ? values.datePaiement : moto.dernierPaiement,
      moto.proprietaireNom,
      moto.proprietairePrenom,
      moto.proprietaireNin,
      moto.proprietaireTelephone,
      moto.conducteurNom,
      moto.conducteurPrenom,
      moto.conducteurNin,
      moto.conducteurTelephone,
      values.type,
      cotisation ? false : moto.enRetard
      );

      if (cotisation) await tx.$executeRaw`
        UPDATE "MotoRegistration"
        SET "enRetard" = false, "dernierPaiement" = ${values.datePaiement}, "prochainPaiement" = ${values.prochainPaiement}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${values.motoId}
      `;

      return row;
    });
  }

  private valueParams(values: MotoValues) {
    return [
      values.matricule,
      values.marque,
      values.modele,
      values.annee,
      values.couleur,
      values.proprietaireId,
      values.conducteurId,
      values.permis,
      values.statut,
      values.photo,
      values.enRetard,
      values.montantPenalite,
      values.prochainPaiement,
      values.dernierPaiement,
      values.year,
    ];
  }

  private peopleParams(people: MotoPeopleDisplay) {
    return [
      people.proprietaireNom,
      people.proprietairePrenom,
      people.proprietaireNin,
      people.proprietaireTelephone,
      people.conducteurNom,
      people.conducteurPrenom,
      people.conducteurNin,
      people.conducteurTelephone,
    ];
  }
}
