import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { Actor, ActorDirectory, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { ContribuableLookup, ContribuableSummary } from '../../../shared/domain/ContribuableLookup';
import type { MotoPayment, MotoPeopleDisplay, MotoRegistration, MotoRepository } from '../domain/Moto';

export const MOTO_TARIF_MENSUEL = 1000;
export const MOTO_PENALITE_RETARD = 250;

export type MotoInput = {
  matricule?: string;
  marque?: string;
  modele?: string;
  annee?: number;
  couleur?: string;
  proprietaireId?: string;
  conducteurId?: string;
  permis?: string;
  statut?: string;
  photo?: string;
  enRetard?: boolean;
  montantPenalite?: number;
  prochainPaiement?: string;
  dernierPaiement?: string;
  year?: number;
};

export type MotoPaymentInput = {
  motoId?: string;
  montant?: number;
  reference?: string;
  mois?: string;
  year?: number;
};

function nextMonthDueDate() {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return next;
}

function peopleDisplay(proprietaire: ContribuableSummary, conducteur: ContribuableSummary | null): MotoPeopleDisplay {
  return {
    proprietaireNom: proprietaire.nom,
    proprietairePrenom: proprietaire.prenom,
    proprietaireNin: proprietaire.nin,
    proprietaireTelephone: proprietaire.telephone,
    conducteurNom: conducteur?.nom || proprietaire.nom,
    conducteurPrenom: conducteur?.prenom || proprietaire.prenom,
    conducteurNin: conducteur?.nin || proprietaire.nin,
    conducteurTelephone: conducteur?.telephone || proprietaire.telephone,
  };
}

export class MotoService {
  constructor(
    private readonly repository: MotoRepository,
    private readonly contribuables: ContribuableLookup,
    private readonly actors: ActorDirectory,
    private readonly auditTrail: AuditTrail
  ) {}

  async list(year: number, search: string, limit?: number) {
    const rows = await this.repository.list(year);
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
    return filtered.slice(0, limit && limit > 0 ? limit : filtered.length).map((row) => this.toMotoView(row));
  }

  async create(actor: Actor, input: MotoInput) {
    const matricule = String(input.matricule || '').trim().toUpperCase();
    const marque = String(input.marque || '').trim();
    const modele = String(input.modele || '').trim();
    const annee = Number(input.annee || new Date().getFullYear());
    const proprietaireId = String(input.proprietaireId || '').trim();
    const conducteurId = input.conducteurId ? String(input.conducteurId).trim() : proprietaireId;
    const permis = input.permis ? String(input.permis).trim() : null;

    if (!matricule || !marque || !modele || !proprietaireId) {
      throw new ValidationError('La moto doit avoir un matricule, une marque, un modèle et un propriétaire.');
    }

    if (await this.repository.findIdByMatricule(matricule)) {
      throw new ConflictError('Ce matricule existe déjà.');
    }

    if (permis && (await this.repository.findIdByPermis(permis))) {
      throw new ConflictError('Ce permis existe déjà.');
    }

    const { proprietaire, conducteur } = await this.findPeople(proprietaireId, conducteurId);

    const created = await this.repository.create(
      {
        matricule,
        marque,
        modele,
        annee,
        couleur: input.couleur ? String(input.couleur).trim() : null,
        proprietaireId,
        conducteurId: conducteurId || null,
        permis,
        statut: input.statut ? String(input.statut).trim().toUpperCase() : 'ACTIVE',
        photo: input.photo ? String(input.photo) : null,
        enRetard: false,
        montantPenalite: MOTO_PENALITE_RETARD,
        prochainPaiement: nextMonthDueDate(),
        dernierPaiement: null,
        year: input.year ? Number(input.year) : new Date().getFullYear(),
      },
      peopleDisplay(proprietaire, conducteur)
    );

    await this.auditTrail.record(actor, {
      action: 'Enregistrement moto',
      module: 'Motos',
      details: `Moto ${created.matricule} enregistrée`,
    });

    return this.toMotoView(created);
  }

  async update(actor: Actor, motoId: string, input: MotoInput) {
    const existing = await this.repository.findById(motoId);
    if (!existing) {
      throw new NotFoundError('Moto introuvable.');
    }

    const nextMatricule = input.matricule ? String(input.matricule).trim().toUpperCase() : existing.matricule;
    if (nextMatricule !== existing.matricule) {
      const duplicateId = await this.repository.findIdByMatricule(nextMatricule);
      if (duplicateId && duplicateId !== existing.id) {
        throw new ConflictError('Ce matricule existe déjà.');
      }
    }

    const nextPermis = input.permis === undefined ? existing.permis : String(input.permis || '').trim() || null;
    if (nextPermis && nextPermis !== existing.permis) {
      const duplicateId = await this.repository.findIdByPermis(nextPermis);
      if (duplicateId && duplicateId !== existing.id) {
        throw new ConflictError('Ce permis existe déjà.');
      }
    }

    const nextProprietaireId =
      input.proprietaireId === undefined ? existing.proprietaireId : String(input.proprietaireId || '').trim();
    const nextConducteurId =
      input.conducteurId === undefined ? existing.conducteurId : String(input.conducteurId || '').trim() || null;

    const { proprietaire, conducteur } = await this.findPeople(nextProprietaireId, nextConducteurId);

    const updated = await this.repository.update(
      motoId,
      {
        matricule: nextMatricule,
        marque: input.marque ? String(input.marque).trim() : existing.marque,
        modele: input.modele ? String(input.modele).trim() : existing.modele,
        annee: input.annee === undefined ? existing.annee : Number(input.annee),
        couleur: input.couleur === undefined ? existing.couleur : String(input.couleur || '').trim() || null,
        proprietaireId: nextProprietaireId,
        conducteurId: nextConducteurId,
        permis: nextPermis,
        statut: input.statut ? String(input.statut).trim().toUpperCase() : existing.statut,
        photo: input.photo === undefined ? existing.photo : String(input.photo || '') || null,
        enRetard: input.enRetard === undefined ? existing.enRetard : Boolean(input.enRetard),
        montantPenalite: input.montantPenalite === undefined ? existing.montantPenalite : Number(input.montantPenalite),
        prochainPaiement:
          input.prochainPaiement === undefined
            ? existing.prochainPaiement
            : input.prochainPaiement
              ? new Date(String(input.prochainPaiement))
              : null,
        dernierPaiement:
          input.dernierPaiement === undefined
            ? existing.dernierPaiement
            : input.dernierPaiement
              ? new Date(String(input.dernierPaiement))
              : null,
        year: input.year === undefined ? existing.year : Number(input.year),
      },
      peopleDisplay(proprietaire, conducteur)
    );

    await this.auditTrail.record(actor, {
      action: 'Mise à jour moto',
      module: 'Motos',
      details: `Moto ${updated.matricule} mise à jour`,
    });

    return this.toMotoView(updated);
  }

  async stats(year: number) {
    const [motos, paiements] = await Promise.all([
      this.repository.listForStats(year),
      this.repository.listPaymentAmounts(year),
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
      penalitesEnCours: enRetard * MOTO_PENALITE_RETARD,
      montantEnRetard: enRetard * (MOTO_TARIF_MENSUEL + MOTO_PENALITE_RETARD),
    };
  }

  configuration() {
    return { tarifMensuel: MOTO_TARIF_MENSUEL, penaliteRetard: MOTO_PENALITE_RETARD };
  }

  async listPayments(year: number) {
    const rows = await this.repository.listPayments(year);
    return rows.map((row) => this.toPaymentView(row));
  }

  async createPayment(actor: Actor, input: MotoPaymentInput) {
    const actorName = await this.actors.displayName(actor.userId);
    const motoId = String(input.motoId || '').trim();
    if (!motoId) {
      throw new ValidationError('La moto est requise pour enregistrer un paiement.');
    }

    const moto = await this.repository.findById(motoId);
    if (!moto) {
      throw new NotFoundError('Moto introuvable.');
    }

    const montant = input.montant
      ? Number(input.montant)
      : moto.enRetard
        ? MOTO_TARIF_MENSUEL + Number(moto.montantPenalite || MOTO_PENALITE_RETARD)
        : MOTO_TARIF_MENSUEL;
    if (Number.isNaN(montant) || montant <= 0) {
      throw new ValidationError('Le montant du paiement moto est invalide.');
    }

    const paiementDate = new Date();
    const nextDueDate = nextMonthDueDate();
    const reference = input.reference ? String(input.reference).trim() : null;
    const created = await this.repository.recordPayment(
      {
        motoId,
        montant,
        reference,
        datePaiement: paiementDate,
        mois: input.mois ? String(input.mois).trim() : paiementDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        numeroRecu: reference || `MOTO-${Date.now()}`,
        agent: actorName,
        year: input.year ? Number(input.year) : new Date().getFullYear(),
        prochainPaiement: nextDueDate,
      },
      moto
    );

    await this.auditTrail.record(actor, {
      action: 'Paiement moto',
      module: 'Motos',
      details: `Paiement enregistré pour la moto ${moto.matricule} (${montant} FCFA)`,
    });

    return this.toPaymentView(created);
  }

  private async findPeople(proprietaireId: string, conducteurId: string | null) {
    const [proprietaire, conducteur] = await Promise.all([
      this.contribuables.findById(proprietaireId),
      conducteurId ? this.contribuables.findById(conducteurId) : Promise.resolve(null),
    ]);
    if (!proprietaire) {
      throw new NotFoundError('Propriétaire introuvable.');
    }
    if (conducteurId && !conducteur) {
      throw new NotFoundError('Conducteur introuvable.');
    }
    return { proprietaire, conducteur };
  }

  private toMotoView(row: MotoRegistration) {
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

  private toPaymentView(row: MotoPayment) {
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
      moto: this.toMotoView({
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
}
