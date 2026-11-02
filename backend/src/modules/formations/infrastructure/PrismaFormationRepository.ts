import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type {
  FormationRepository,
  TrainingProgram,
  TrainingProgramValues,
  YouthProfile,
  YouthProfileValues,
} from '../domain/Formation';

export class PrismaFormationRepository implements FormationRepository {
  listPrograms(year: number) {
    return prisma.$queryRawUnsafe<TrainingProgram[]>(
      `SELECT
        f.*,
        COALESCE(COUNT(e."id"), 0)::int AS "nombreInscrits",
        COALESCE(SUM(CASE WHEN e."statutFinal" = 'Certifié' THEN 1 ELSE 0 END), 0)::int AS "nombreCertifies"
      FROM "TrainingProgram" f
      LEFT JOIN "YouthEnrollment" e ON e."formationId" = f."id"
      WHERE f."year" = $1
      GROUP BY f."id"
      ORDER BY f."dateDebut" DESC`,
      year
    );
  }

  async findProgramById(id: string) {
    const [row] = await prisma.$queryRawUnsafe<TrainingProgram[]>(
      `SELECT f.*, 0::int AS "nombreInscrits", 0::int AS "nombreCertifies" FROM "TrainingProgram" f WHERE f."id" = $1 LIMIT 1`,
      id
    );
    return row || null;
  }

  async createProgram(values: TrainingProgramValues) {
    const [row] = await prisma.$queryRawUnsafe<TrainingProgram[]>(
      `INSERT INTO "TrainingProgram" ("id","nom","domaine","duree","responsable","budget","dateDebut","dateFin","statut","year","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, 0::int AS "nombreInscrits", 0::int AS "nombreCertifies"`,
      randomUUID(),
      values.nom,
      values.domaine,
      values.duree,
      values.responsable,
      values.budget,
      values.dateDebut,
      values.dateFin,
      values.statut,
      values.year
    );
    return row;
  }

  async updateProgram(id: string, values: TrainingProgramValues) {
    const [row] = await prisma.$queryRawUnsafe<TrainingProgram[]>(
      `UPDATE "TrainingProgram"
       SET "nom" = $2, "domaine" = $3, "duree" = $4, "responsable" = $5, "budget" = $6, "dateDebut" = $7, "dateFin" = $8, "statut" = $9, "year" = $10, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING *, 0::int AS "nombreInscrits", 0::int AS "nombreCertifies"`,
      id,
      values.nom,
      values.domaine,
      values.duree,
      values.responsable,
      values.budget,
      values.dateDebut,
      values.dateFin,
      values.statut,
      values.year
    );
    return row;
  }

  async deleteProgram(id: string) {
    await prisma.$executeRaw`DELETE FROM "TrainingProgram" WHERE "id" = ${id}`;
  }

  listProgramsForStats(year: number) {
    return prisma.$queryRawUnsafe<Array<Pick<TrainingProgram, 'domaine' | 'statut' | 'budget'>>>(
      'SELECT "domaine","statut","budget" FROM "TrainingProgram" WHERE "year" = $1',
      year
    );
  }

  listYouthSexes(year: number) {
    return prisma.$queryRawUnsafe<Array<Pick<YouthProfile, 'sexe'>>>('SELECT "sexe" FROM "YouthProfile" WHERE "year" = $1', year);
  }

  listEnrollmentOutcomes(year: number) {
    return prisma.$queryRawUnsafe<Array<Pick<YouthProfile, 'statutFinal'>>>(
      `SELECT e."statutFinal" FROM "YouthEnrollment" e
       INNER JOIN "TrainingProgram" f ON f."id" = e."formationId"
       WHERE f."year" = $1`,
      year
    );
  }

  listYouthWithEnrollments(year: number) {
    return prisma.$queryRawUnsafe<YouthProfile[]>(
      `SELECT
        j.*,
        e."formationId",
        e."dateInscription",
        e."tauxAssiduite",
        e."statutFinal",
        e."presences",
        e."absences"
      FROM "YouthProfile" j
      LEFT JOIN "YouthEnrollment" e ON e."jeuneId" = j."id"
      WHERE j."year" = $1
      ORDER BY j."createdAt" DESC`,
      year
    );
  }

  async existsYouthWithCniOrPhone(cni: string, telephone: string) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "YouthProfile" WHERE "cni" = $1 OR "telephone" = $2 LIMIT 1',
      cni,
      telephone
    );
    return rows.length > 0;
  }

  async createYouth(values: YouthProfileValues) {
    const [row] = await prisma.$queryRawUnsafe<YouthProfile[]>(
      `INSERT INTO "YouthProfile" ("id","nom","prenom","cni","telephone","adresse","niveauEtude","sexe","dateNaiss","photo","year","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, NULL::text AS "formationId", NULL::timestamp AS "dateInscription", NULL::double precision AS "tauxAssiduite", NULL::text AS "statutFinal", NULL::int AS "presences", NULL::int AS "absences"`,
      randomUUID(),
      values.nom,
      values.prenom,
      values.cni,
      values.telephone,
      values.adresse,
      values.niveauEtude,
      values.sexe,
      values.dateNaiss,
      values.photo,
      values.year
    );
    return row;
  }

  async findYouthById(id: string) {
    const [row] = await prisma.$queryRawUnsafe<Array<Pick<YouthProfile, 'id' | 'nom' | 'prenom'>>>(
      'SELECT "id","nom","prenom" FROM "YouthProfile" WHERE "id" = $1 LIMIT 1',
      id
    );
    return row || null;
  }

  async deleteYouth(id: string) {
    await prisma.$executeRaw`DELETE FROM "YouthProfile" WHERE "id" = ${id}`;
  }

  async existsEnrollment(jeuneId: string, formationId: string) {
    const [row] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "YouthEnrollment" WHERE "jeuneId" = $1 AND "formationId" = $2 LIMIT 1',
      jeuneId,
      formationId
    );
    return Boolean(row);
  }

  async createEnrollment(jeuneId: string, formationId: string) {
    await prisma.$executeRaw`
      INSERT INTO "YouthEnrollment" ("id","jeuneId","formationId","dateInscription","tauxAssiduite","statutFinal","presences","absences","createdAt","updatedAt")
      VALUES (${randomUUID()}, ${jeuneId}, ${formationId}, CURRENT_TIMESTAMP, 0, ${'En cours'}, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
  }
}
