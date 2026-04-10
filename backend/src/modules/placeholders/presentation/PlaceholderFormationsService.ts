import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';

type TrainingProgramRow = {
  id: string;
  nom: string;
  domaine: string;
  duree: string;
  responsable: string;
  budget: number;
  dateDebut: Date;
  dateFin: Date;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  nombreInscrits: number;
  nombreCertifies: number;
};

type YouthRow = {
  id: string;
  nom: string;
  prenom: string;
  cni: string;
  telephone: string;
  adresse: string;
  niveauEtude: string;
  sexe: string;
  dateNaiss: Date;
  photo: string | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  formationId: string | null;
  dateInscription: Date | null;
  tauxAssiduite: number | null;
  statutFinal: string | null;
  presences: number | null;
  absences: number | null;
};

export class PlaceholderFormationsService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async listFormations(year: number) {
    const rows = await prisma.$queryRawUnsafe<TrainingProgramRow[]>(
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

    return rows.map((row) => this.mapFormationRow(row));
  }

  async createFormation(req: AuthRequest) {
    const payload = req.body || {};
    const nom = String(payload.nom || '').trim();
    const domaine = String(payload.domaine || '').trim();
    const duree = String(payload.duree || '').trim();
    const responsable = String(payload.responsable || '').trim();
    const budget = Number(payload.budget || 0);
    const dateDebut = new Date(String(payload.dateDebut || ''));
    const dateFin = new Date(String(payload.dateFin || ''));
    const statut = this.normalizeFormationStatus(String(payload.statut || 'PLANIFIEE'));
    const year = payload.year ? Number(payload.year) : dateDebut.getFullYear();

    if (!nom || !domaine || !duree || !responsable || Number.isNaN(dateDebut.getTime()) || Number.isNaN(dateFin.getTime())) {
      throw new ValidationError('Les informations de formation sont incomplètes.');
    }

    const [created] = await prisma.$queryRawUnsafe<TrainingProgramRow[]>(
      `INSERT INTO "TrainingProgram" ("id","nom","domaine","duree","responsable","budget","dateDebut","dateFin","statut","year","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, 0::int AS "nombreInscrits", 0::int AS "nombreCertifies"`,
      randomUUID(),
      nom,
      domaine,
      duree,
      responsable,
      budget,
      dateDebut,
      dateFin,
      statut,
      year
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création formation',
      module: 'Formations',
      details: `Formation ${created.nom} créée`,
    });

    return this.mapFormationRow(created);
  }

  async updateFormation(req: AuthRequest) {
    const formationId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<TrainingProgramRow[]>(
      `SELECT f.*, 0::int AS "nombreInscrits", 0::int AS "nombreCertifies" FROM "TrainingProgram" f WHERE f."id" = $1 LIMIT 1`,
      formationId
    );
    if (!existing) {
      throw new NotFoundError('Formation introuvable.');
    }

    const payload = req.body || {};
    const [updated] = await prisma.$queryRawUnsafe<TrainingProgramRow[]>(
      `UPDATE "TrainingProgram"
       SET "nom" = $2, "domaine" = $3, "duree" = $4, "responsable" = $5, "budget" = $6, "dateDebut" = $7, "dateFin" = $8, "statut" = $9, "year" = $10, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING *, 0::int AS "nombreInscrits", 0::int AS "nombreCertifies"`,
      formationId,
      payload.nom ? String(payload.nom).trim() : existing.nom,
      payload.domaine ? String(payload.domaine).trim() : existing.domaine,
      payload.duree ? String(payload.duree).trim() : existing.duree,
      payload.responsable ? String(payload.responsable).trim() : existing.responsable,
      payload.budget === undefined ? existing.budget : Number(payload.budget),
      payload.dateDebut ? new Date(String(payload.dateDebut)) : existing.dateDebut,
      payload.dateFin ? new Date(String(payload.dateFin)) : existing.dateFin,
      payload.statut ? this.normalizeFormationStatus(String(payload.statut)) : existing.statut,
      payload.year ? Number(payload.year) : existing.year
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Mise à jour formation',
      module: 'Formations',
      details: `Formation ${updated.nom} mise à jour`,
    });

    return this.mapFormationRow(updated);
  }

  async deleteFormation(req: AuthRequest) {
    const formationId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<Array<{ id: string; nom: string }>>(
      'SELECT "id", "nom" FROM "TrainingProgram" WHERE "id" = $1 LIMIT 1',
      formationId
    );
    if (!existing) {
      throw new NotFoundError('Formation introuvable.');
    }

    await prisma.$executeRaw`DELETE FROM "TrainingProgram" WHERE "id" = ${formationId}`;
    await this.supportService.writeAuditLog(req, {
      action: 'Suppression formation',
      module: 'Formations',
      details: `Formation ${existing.nom} supprimée`,
      status: 'warning',
    });
  }

  async getFormationStats(year: number) {
    const [formations, jeunes, enrollments] = await Promise.all([
      prisma.$queryRawUnsafe<Array<Pick<TrainingProgramRow, 'domaine' | 'statut' | 'budget'>>>(
        'SELECT "domaine","statut","budget" FROM "TrainingProgram" WHERE "year" = $1',
        year
      ),
      prisma.$queryRawUnsafe<Array<Pick<YouthRow, 'sexe'>>>('SELECT "sexe" FROM "YouthProfile" WHERE "year" = $1', year),
      prisma.$queryRawUnsafe<Array<Pick<YouthRow, 'statutFinal'>>>(
        `SELECT e."statutFinal" FROM "YouthEnrollment" e
         INNER JOIN "TrainingProgram" f ON f."id" = e."formationId"
         WHERE f."year" = $1`,
        year
      ),
    ]);

    const repartitionDomaines = Array.from(
      new Map(formations.map((item) => [item.domaine, formations.filter((f) => f.domaine === item.domaine).length])).entries()
    ).map(([domaine, nombre]) => ({
      domaine,
      nombre,
      pourcentage: formations.length ? Math.round((nombre / formations.length) * 100) : 0,
    }));

    const repartitionSexe = Array.from(
      new Map(jeunes.map((item) => [item.sexe, jeunes.filter((j) => j.sexe === item.sexe).length])).entries()
    ).map(([sexe, nombre]) => ({
      sexe,
      nombre,
      pourcentage: jeunes.length ? Math.round((nombre / jeunes.length) * 100) : 0,
    }));

    const totalCertifies = enrollments.filter((item) => item.statutFinal === 'Certifié').length;

    return {
      totalFormations: formations.length,
      formationsEnCours: formations.filter((item) => item.statut === 'EN_COURS').length,
      formationsTerminees: formations.filter((item) => item.statut === 'TERMINEE').length,
      totalJeunes: jeunes.length,
      totalJeunesFormes: jeunes.length,
      certifies: totalCertifies,
      totalCertifies,
      tauxReussiteGlobal: enrollments.length ? Math.round((totalCertifies / enrollments.length) * 100) : 0,
      budgetTotal: formations.reduce((sum, item) => sum + Number(item.budget || 0), 0),
      repartitionDomaines,
      repartitionSexe,
      evolutionAnnuelle: [{ annee: year, nombre: formations.length }],
    };
  }

  async listJeunes(year: number, search: string, limit?: number) {
    const rows = await prisma.$queryRawUnsafe<YouthRow[]>(
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

    const grouped = new Map<string, ReturnType<PlaceholderFormationsService['mapYouthRow']>>();
    for (const row of rows) {
      const base = this.mapYouthRow(row);
      if (!grouped.has(row.id)) {
        grouped.set(row.id, base);
      } else if (row.formationId) {
        grouped.get(row.id)?.formations?.push(...(base.formations || []));
      }
    }

    const values = Array.from(grouped.values()).filter((item) => {
      if (!search) return true;
      return `${item.nom} ${item.prenom} ${item.cni} ${item.telephone}`.toLowerCase().includes(search);
    });

    return limit ? values.slice(0, limit) : values;
  }

  async createJeune(req: AuthRequest) {
    const payload = req.body || {};
    const cni = String(payload.cni || '').trim();
    const telephone = String(payload.telephone || '').trim();

    if (!payload.nom || !payload.prenom || !cni || !telephone) {
      throw new ValidationError('Les informations du jeune sont incomplètes.');
    }

    const duplicate = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "YouthProfile" WHERE "cni" = $1 OR "telephone" = $2 LIMIT 1',
      cni,
      telephone
    );
    if (duplicate.length > 0) {
      throw new ConflictError('Un jeune avec ce CNI ou ce téléphone existe déjà.');
    }

    const [created] = await prisma.$queryRawUnsafe<YouthRow[]>(
      `INSERT INTO "YouthProfile" ("id","nom","prenom","cni","telephone","adresse","niveauEtude","sexe","dateNaiss","photo","year","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING *, NULL::text AS "formationId", NULL::timestamp AS "dateInscription", NULL::double precision AS "tauxAssiduite", NULL::text AS "statutFinal", NULL::int AS "presences", NULL::int AS "absences"`,
      randomUUID(),
      String(payload.nom).trim(),
      String(payload.prenom).trim(),
      cni,
      telephone,
      String(payload.adresse || '').trim(),
      String(payload.niveauEtude || '').trim(),
      String(payload.sexe || '').trim(),
      new Date(String(payload.dateNaiss)),
      payload.photo ? String(payload.photo) : null,
      payload.year ? Number(payload.year) : new Date().getFullYear()
    );

    await this.supportService.writeAuditLog(req, {
      action: 'Création profil jeune',
      module: 'Formations',
      details: `Jeune ${created.prenom} ${created.nom} créé`,
    });

    return this.mapYouthRow(created);
  }

  async deleteJeune(req: AuthRequest) {
    const jeuneId = String(req.params.id);
    const [existing] = await prisma.$queryRawUnsafe<Array<{ id: string; nom: string; prenom: string }>>(
      'SELECT "id","nom","prenom" FROM "YouthProfile" WHERE "id" = $1 LIMIT 1',
      jeuneId
    );
    if (!existing) {
      throw new NotFoundError('Jeune introuvable.');
    }

    await prisma.$executeRaw`DELETE FROM "YouthProfile" WHERE "id" = ${jeuneId}`;
    await this.supportService.writeAuditLog(req, {
      action: 'Suppression profil jeune',
      module: 'Formations',
      details: `Jeune ${existing.prenom} ${existing.nom} supprimé`,
      status: 'warning',
    });
  }

  async inscrireJeuneFormation(req: AuthRequest) {
    const jeuneId = String(req.params.id);
    const formationId = String(req.params.formationId);
    const [duplicate] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "YouthEnrollment" WHERE "jeuneId" = $1 AND "formationId" = $2 LIMIT 1',
      jeuneId,
      formationId
    );

    if (duplicate) {
      throw new ConflictError('Ce jeune est déjà inscrit à cette formation.');
    }

    await prisma.$executeRaw`
      INSERT INTO "YouthEnrollment" ("id","jeuneId","formationId","dateInscription","tauxAssiduite","statutFinal","presences","absences","createdAt","updatedAt")
      VALUES (${randomUUID()}, ${jeuneId}, ${formationId}, CURRENT_TIMESTAMP, 0, ${'En cours'}, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    await this.supportService.writeAuditLog(req, {
      action: 'Inscription jeune',
      module: 'Formations',
      details: `Jeune ${jeuneId} inscrit à la formation ${formationId}`,
    });
  }

  private mapFormationRow(row: TrainingProgramRow) {
    const nombreInscrits = Number(row.nombreInscrits || 0);
    const nombreCertifies = Number(row.nombreCertifies || 0);
    return {
      id: row.id,
      nom: row.nom,
      domaine: row.domaine,
      duree: row.duree,
      responsable: row.responsable,
      budget: Number(row.budget || 0),
      dateDebut: row.dateDebut.toISOString(),
      dateFin: row.dateFin.toISOString(),
      statut: row.statut,
      nombreInscrits,
      nombreCertifies,
      tauxReussite: nombreInscrits > 0 ? Math.round((nombreCertifies / nombreInscrits) * 100) : 0,
      year: row.year,
    };
  }

  private mapYouthRow(row: YouthRow) {
    return {
      id: row.id,
      nom: row.nom,
      prenom: row.prenom,
      cni: row.cni,
      telephone: row.telephone,
      adresse: row.adresse,
      niveauEtude: row.niveauEtude,
      sexe: row.sexe,
      dateNaiss: row.dateNaiss.toISOString(),
      photo: row.photo || null,
      createdAt: row.createdAt.toISOString(),
      year: row.year,
      formations: row.formationId
        ? [{
            formationId: row.formationId,
            dateInscription: row.dateInscription?.toISOString(),
            tauxAssiduite: Number(row.tauxAssiduite || 0),
            statutFinal: row.statutFinal || 'En cours',
            presences: Number(row.presences || 0),
            absences: Number(row.absences || 0),
          }]
        : [],
    };
  }

  private normalizeFormationStatus(status: string) {
    const normalized = status.trim().toUpperCase();
    if (['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'].includes(normalized)) {
      return normalized;
    }
    return 'PLANIFIEE';
  }
}
