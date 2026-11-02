import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { FormationRepository, TrainingProgram, YouthProfile } from '../domain/Formation';

export type FormationInput = {
  nom?: string;
  domaine?: string;
  duree?: string;
  responsable?: string;
  budget?: number;
  dateDebut?: string;
  dateFin?: string;
  statut?: string;
  year?: number;
};

export type YouthInput = {
  nom?: string;
  prenom?: string;
  cni?: string;
  telephone?: string;
  adresse?: string;
  niveauEtude?: string;
  sexe?: string;
  dateNaiss?: string;
  photo?: string;
  year?: number;
};

export function normalizeFormationStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  if (['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'].includes(normalized)) {
    return normalized;
  }
  return 'PLANIFIEE';
}

function distribution<K extends string>(items: Array<Record<K, string>>, key: K) {
  return Array.from(new Map(items.map((item) => [item[key], items.filter((other) => other[key] === item[key]).length])).entries());
}

export class FormationService {
  constructor(
    private readonly repository: FormationRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async listFormations(year: number) {
    const rows = await this.repository.listPrograms(year);
    return rows.map((row) => this.toFormationView(row));
  }

  async createFormation(actor: Actor, input: FormationInput) {
    const nom = String(input.nom || '').trim();
    const domaine = String(input.domaine || '').trim();
    const duree = String(input.duree || '').trim();
    const responsable = String(input.responsable || '').trim();
    const budget = Number(input.budget || 0);
    const dateDebut = new Date(String(input.dateDebut || ''));
    const dateFin = new Date(String(input.dateFin || ''));
    const statut = normalizeFormationStatus(String(input.statut || 'PLANIFIEE'));
    const year = input.year ? Number(input.year) : dateDebut.getFullYear();

    if (!nom || !domaine || !duree || !responsable || Number.isNaN(dateDebut.getTime()) || Number.isNaN(dateFin.getTime())) {
      throw new ValidationError('Les informations de formation sont incomplètes.');
    }

    const created = await this.repository.createProgram({ nom, domaine, duree, responsable, budget, dateDebut, dateFin, statut, year });

    await this.auditTrail.record(actor, {
      action: 'Création formation',
      module: 'Formations',
      details: `Formation ${created.nom} créée`,
    });

    return this.toFormationView(created);
  }

  async updateFormation(actor: Actor, formationId: string, input: FormationInput) {
    const existing = await this.repository.findProgramById(formationId);
    if (!existing) {
      throw new NotFoundError('Formation introuvable.');
    }

    const updated = await this.repository.updateProgram(formationId, {
      nom: input.nom ? String(input.nom).trim() : existing.nom,
      domaine: input.domaine ? String(input.domaine).trim() : existing.domaine,
      duree: input.duree ? String(input.duree).trim() : existing.duree,
      responsable: input.responsable ? String(input.responsable).trim() : existing.responsable,
      budget: input.budget === undefined ? existing.budget : Number(input.budget),
      dateDebut: input.dateDebut ? new Date(String(input.dateDebut)) : existing.dateDebut,
      dateFin: input.dateFin ? new Date(String(input.dateFin)) : existing.dateFin,
      statut: input.statut ? normalizeFormationStatus(String(input.statut)) : existing.statut,
      year: input.year ? Number(input.year) : existing.year,
    });

    await this.auditTrail.record(actor, {
      action: 'Mise à jour formation',
      module: 'Formations',
      details: `Formation ${updated.nom} mise à jour`,
    });

    return this.toFormationView(updated);
  }

  async deleteFormation(actor: Actor, formationId: string) {
    const existing = await this.repository.findProgramById(formationId);
    if (!existing) {
      throw new NotFoundError('Formation introuvable.');
    }

    await this.repository.deleteProgram(formationId);
    await this.auditTrail.record(actor, {
      action: 'Suppression formation',
      module: 'Formations',
      details: `Formation ${existing.nom} supprimée`,
      status: 'warning',
    });
  }

  async getStats(year: number) {
    const [formations, jeunes, enrollments] = await Promise.all([
      this.repository.listProgramsForStats(year),
      this.repository.listYouthSexes(year),
      this.repository.listEnrollmentOutcomes(year),
    ]);

    const repartitionDomaines = distribution(formations, 'domaine').map(([domaine, nombre]) => ({
      domaine,
      nombre,
      pourcentage: formations.length ? Math.round((nombre / formations.length) * 100) : 0,
    }));

    const repartitionSexe = distribution(jeunes, 'sexe').map(([sexe, nombre]) => ({
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
    const rows = await this.repository.listYouthWithEnrollments(year);

    const grouped = new Map<string, ReturnType<FormationService['toYouthView']>>();
    for (const row of rows) {
      const view = this.toYouthView(row);
      if (!grouped.has(row.id)) {
        grouped.set(row.id, view);
      } else if (row.formationId) {
        grouped.get(row.id)?.formations?.push(...(view.formations || []));
      }
    }

    const values = Array.from(grouped.values()).filter((item) => {
      if (!search) return true;
      return `${item.nom} ${item.prenom} ${item.cni} ${item.telephone}`.toLowerCase().includes(search);
    });

    return limit ? values.slice(0, limit) : values;
  }

  async createJeune(actor: Actor, input: YouthInput) {
    const cni = String(input.cni || '').trim();
    const telephone = String(input.telephone || '').trim();

    if (!input.nom || !input.prenom || !cni || !telephone) {
      throw new ValidationError('Les informations du jeune sont incomplètes.');
    }

    if (await this.repository.existsYouthWithCniOrPhone(cni, telephone)) {
      throw new ConflictError('Un jeune avec ce CNI ou ce téléphone existe déjà.');
    }

    const created = await this.repository.createYouth({
      nom: String(input.nom).trim(),
      prenom: String(input.prenom).trim(),
      cni,
      telephone,
      adresse: String(input.adresse || '').trim(),
      niveauEtude: String(input.niveauEtude || '').trim(),
      sexe: String(input.sexe || '').trim(),
      dateNaiss: new Date(String(input.dateNaiss)),
      photo: input.photo ? String(input.photo) : null,
      year: input.year ? Number(input.year) : new Date().getFullYear(),
    });

    await this.auditTrail.record(actor, {
      action: 'Création profil jeune',
      module: 'Formations',
      details: `Jeune ${created.prenom} ${created.nom} créé`,
    });

    return this.toYouthView(created);
  }

  async deleteJeune(actor: Actor, jeuneId: string) {
    const existing = await this.repository.findYouthById(jeuneId);
    if (!existing) {
      throw new NotFoundError('Jeune introuvable.');
    }

    await this.repository.deleteYouth(jeuneId);
    await this.auditTrail.record(actor, {
      action: 'Suppression profil jeune',
      module: 'Formations',
      details: `Jeune ${existing.prenom} ${existing.nom} supprimé`,
      status: 'warning',
    });
  }

  async inscrireJeune(actor: Actor, jeuneId: string, formationId: string) {
    if (await this.repository.existsEnrollment(jeuneId, formationId)) {
      throw new ConflictError('Ce jeune est déjà inscrit à cette formation.');
    }

    await this.repository.createEnrollment(jeuneId, formationId);

    await this.auditTrail.record(actor, {
      action: 'Inscription jeune',
      module: 'Formations',
      details: `Jeune ${jeuneId} inscrit à la formation ${formationId}`,
    });
  }

  private toFormationView(row: TrainingProgram) {
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

  private toYouthView(row: YouthProfile) {
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
}
