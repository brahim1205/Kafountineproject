import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { UrbanismeCase, UrbanismeDisplay, UrbanismeRepository, UrbanismeValues } from '../domain/Urbanisme';

const SELECT_WITH_RELATIONS = `SELECT
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
      LEFT JOIN "User" a ON a."id" = u."agentId"`;

const RETURNING_COLUMNS = `"id",
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
        "updatedAt"`;

export class PrismaUrbanismeRepository implements UrbanismeRepository {
  list(year: number) {
    return prisma.$queryRawUnsafe<UrbanismeCase[]>(
      `${SELECT_WITH_RELATIONS}
      WHERE u."year" = $1
      ORDER BY u."createdAt" DESC`,
      year
    );
  }

  async findById(id: string) {
    const [row] = await prisma.$queryRawUnsafe<UrbanismeCase[]>(
      `${SELECT_WITH_RELATIONS}
      WHERE u."id" = $1
      LIMIT 1`,
      id
    );
    return row || null;
  }

  async create(
    values: UrbanismeValues & { contribuableId: string; agentId: string | null; year: number },
    display: UrbanismeDisplay
  ) {
    const [row] = await prisma.$queryRawUnsafe<UrbanismeCase[]>(
      `INSERT INTO "UrbanismeCase" ("id", "numero", "contribuableId", "agentId", "type", "description", "surface", "localisation", "nature", "montant", "statut", "year", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING
        ${RETURNING_COLUMNS},
        $13::text AS "contribuableNom",
        $14::text AS "contribuablePrenom",
        $15::text AS "contribuableNin",
        $16::text AS "contribuableTelephone",
        $17::text AS "contribuableAdresse",
        $18::text AS "agentNom",
        $19::text AS "agentPrenom"`,
      randomUUID(),
      values.numero,
      values.contribuableId,
      values.agentId,
      values.type,
      values.description,
      values.surface,
      values.localisation,
      values.nature,
      values.montant,
      values.statut,
      values.year,
      display.contribuableNom,
      display.contribuablePrenom,
      display.contribuableNin,
      display.contribuableTelephone,
      display.contribuableAdresse,
      display.agentNom,
      display.agentPrenom
    );
    return row;
  }

  async update(id: string, values: UrbanismeValues, display: UrbanismeDisplay) {
    const [row] = await prisma.$queryRawUnsafe<UrbanismeCase[]>(
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
        ${RETURNING_COLUMNS},
        $10::text AS "contribuableNom",
        $11::text AS "contribuablePrenom",
        $12::text AS "contribuableNin",
        $13::text AS "contribuableTelephone",
        $14::text AS "contribuableAdresse",
        $15::text AS "agentNom",
        $16::text AS "agentPrenom"`,
      id,
      values.numero,
      values.type,
      values.description,
      values.surface,
      values.localisation,
      values.nature,
      values.montant,
      values.statut,
      display.contribuableNom,
      display.contribuablePrenom,
      display.contribuableNin,
      display.contribuableTelephone,
      display.contribuableAdresse,
      display.agentNom,
      display.agentPrenom
    );
    return row;
  }

  async delete(id: string) {
    await prisma.$executeRaw`DELETE FROM "UrbanismeCase" WHERE "id" = ${id}`;
  }

  listForStats(year: number) {
    return prisma.$queryRawUnsafe<Array<Pick<UrbanismeCase, 'montant' | 'statut'>>>(
      'SELECT "montant", "statut" FROM "UrbanismeCase" WHERE "year" = $1',
      year
    );
  }
}
