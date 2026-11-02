import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { EtatCivilDisplay, EtatCivilRepository, EtatCivilRequest, EtatCivilValues } from '../domain/EtatCivil';

const SELECT_WITH_RELATIONS = `SELECT
        e.*,
        c."nom" AS "contribuableNom",
        c."prenom" AS "contribuablePrenom",
        c."nin" AS "contribuableNin",
        c."telephone" AS "contribuableTelephone",
        u."nom" AS "agentNom",
        u."prenom" AS "agentPrenom"
      FROM "EtatCivilRequest" e
      INNER JOIN "Contribuable" c ON c."id" = e."contribuableId"
      LEFT JOIN "User" u ON u."id" = e."agentId"`;

const RETURNING_COLUMNS = `"id",
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
        "updatedAt"`;

export class PrismaEtatCivilRepository implements EtatCivilRepository {
  list(year: number) {
    return prisma.$queryRawUnsafe<EtatCivilRequest[]>(
      `${SELECT_WITH_RELATIONS}
      WHERE e."year" = $1
      ORDER BY e."createdAt" DESC`,
      year
    );
  }

  async findById(id: string) {
    const [row] = await prisma.$queryRawUnsafe<EtatCivilRequest[]>(
      `${SELECT_WITH_RELATIONS}
      WHERE e."id" = $1
      LIMIT 1`,
      id
    );
    return row || null;
  }

  async create(
    values: EtatCivilValues & { numero: string; agentId: string | null; year: number },
    display: EtatCivilDisplay
  ) {
    const [row] = await prisma.$queryRawUnsafe<EtatCivilRequest[]>(
      `INSERT INTO "EtatCivilRequest" ("id", "numero", "contribuableId", "agentId", "typeDocument", "exemplaires", "montant", "statut", "observations", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        ${RETURNING_COLUMNS},
        $11::text AS "contribuableNom",
        $12::text AS "contribuablePrenom",
        $13::text AS "contribuableNin",
        $14::text AS "contribuableTelephone",
        $15::text AS "agentNom",
        $16::text AS "agentPrenom"`,
      randomUUID(),
      values.numero,
      values.contribuableId,
      values.agentId,
      values.typeDocument,
      values.exemplaires,
      values.montant,
      values.statut,
      values.observations,
      values.year,
      display.contribuableNom,
      display.contribuablePrenom,
      display.contribuableNin,
      display.contribuableTelephone,
      display.agentNom,
      display.agentPrenom
    );
    return row;
  }

  async update(id: string, values: EtatCivilValues, display: EtatCivilDisplay) {
    const [row] = await prisma.$queryRawUnsafe<EtatCivilRequest[]>(
      `UPDATE "EtatCivilRequest"
       SET
        "contribuableId" = $2,
        "typeDocument" = $3,
        "exemplaires" = $4,
        "montant" = $5,
        "statut" = $6,
        "observations" = $7,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING
        ${RETURNING_COLUMNS},
        $8::text AS "contribuableNom",
        $9::text AS "contribuablePrenom",
        $10::text AS "contribuableNin",
        $11::text AS "contribuableTelephone",
        $12::text AS "agentNom",
        $13::text AS "agentPrenom"`,
      id,
      values.contribuableId,
      values.typeDocument,
      values.exemplaires,
      values.montant,
      values.statut,
      values.observations,
      display.contribuableNom,
      display.contribuablePrenom,
      display.contribuableNin,
      display.contribuableTelephone,
      display.agentNom,
      display.agentPrenom
    );
    return row;
  }

  async delete(id: string) {
    await prisma.$executeRaw`DELETE FROM "EtatCivilRequest" WHERE "id" = ${id}`;
  }

  listForStats(year: number) {
    return prisma.$queryRawUnsafe<Array<Pick<EtatCivilRequest, 'montant' | 'statut'>>>(
      'SELECT "montant", "statut" FROM "EtatCivilRequest" WHERE "year" = $1',
      year
    );
  }
}
