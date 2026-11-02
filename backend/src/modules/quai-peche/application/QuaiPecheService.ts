import { NotFoundError } from '../../../shared/errors/AppError';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type {
  FishCommission,
  Fisherman,
  FishingBoat,
  QuaiCollection,
  QuaiPecheRepository,
  RefrigeratedTruck,
  ShippingExpedition,
} from '../domain/QuaiPeche';

export type QuaiInput = Record<string, unknown> & { year?: number };

const NOT_FOUND_MESSAGES: Record<QuaiCollection, string> = {
  pecheurs: 'Pêcheur introuvable.',
  embarcations: 'Embarcation introuvable.',
  commissions: 'Commission introuvable.',
  camions: 'Camion introuvable.',
  expeditions: 'Expédition introuvable.',
};

const text = (value: unknown) => String(value || '').trim();
const optionalText = (value: unknown) => (value ? String(value).trim() : null);
const optionalNumber = (value: unknown) => (value === undefined ? null : Number(value));
const status = (value: unknown, fallback: string) => String(value || fallback).trim().toUpperCase();
const reference = (prefix: string, year: number) =>
  `${prefix}-${year}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

export class QuaiPecheService {
  constructor(
    private readonly repository: QuaiPecheRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async list(collection: QuaiCollection, year: number) {
    switch (collection) {
      case 'pecheurs':
        return (await this.repository.listFishermen(year)).map((row) => this.toFishermanView(row));
      case 'embarcations':
        return (await this.repository.listBoats(year)).map((row) => this.toBoatView(row));
      case 'commissions':
        return (await this.repository.listCommissions(year)).map((row) => this.toCommissionView(row));
      case 'camions':
        return (await this.repository.listTrucks(year)).map((row) => this.toTruckView(row));
      case 'expeditions':
        return (await this.repository.listExpeditions(year)).map((row) => this.toExpeditionView(row));
    }
  }

  async get(collection: QuaiCollection, id: string) {
    switch (collection) {
      case 'pecheurs':
        return this.toFishermanView(this.required(collection, await this.repository.findFisherman(id)));
      case 'embarcations':
        return this.toBoatView(this.required(collection, await this.repository.findBoat(id)));
      case 'commissions':
        return this.toCommissionView(this.required(collection, await this.repository.findCommission(id)));
      case 'camions':
        return this.toTruckView(this.required(collection, await this.repository.findTruck(id)));
      case 'expeditions':
        return this.toExpeditionView(this.required(collection, await this.repository.findExpedition(id)));
    }
  }

  async stats(year: number) {
    const [commissions, totalPecheurs, totalEmbarcations] = await Promise.all([
      this.repository.listCommissionWeights(year),
      this.repository.countActiveFishermen(year),
      this.repository.countBoats(year),
    ]);
    return {
      totalCommissions: commissions.length,
      totalPoids: commissions.reduce((sum, item) => sum + Number(item.poids || 0), 0),
      commissionsEnAttente: commissions.filter((item) => item.statut === 'ENREGISTREE').length,
      totalPecheurs,
      totalEmbarcations,
    };
  }

  async create(actor: Actor, collection: QuaiCollection, input: QuaiInput) {
    const year = input.year ? Number(input.year) : new Date().getFullYear();
    switch (collection) {
      case 'pecheurs': {
        const row = await this.repository.createFisherman({
          nom: text(input.nom),
          prenom: text(input.prenom),
          telephone: optionalText(input.telephone),
          nin: optionalText(input.nin),
          adresse: optionalText(input.adresse),
          statut: status(input.statut, 'ACTIF'),
          year,
        });
        await this.audit(actor, 'Création pêcheur', `Pêcheur ${row.prenom} ${row.nom} créé`);
        return this.toFishermanView(row);
      }
      case 'embarcations': {
        const owner = input.pecheurId ? await this.repository.findFisherman(String(input.pecheurId)) : null;
        const row = await this.repository.createBoat(
          {
            nom: text(input.nom),
            immatriculation: text(input.immatriculation).toUpperCase(),
            type: text(input.type),
            taille: optionalNumber(input.taille),
            moteur: optionalText(input.moteur),
            statut: status(input.statut, 'ACTIF'),
            pecheurId: input.pecheurId ? String(input.pecheurId) : null,
            year,
          },
          owner
        );
        await this.audit(actor, 'Création embarcation', `Embarcation ${row.immatriculation} créée`);
        return this.toBoatView(row);
      }
      case 'commissions': {
        const fisherman = this.required('pecheurs', await this.repository.findFisherman(text(input.pecheurId)));
        const row = await this.repository.createCommission(
          {
            numero: reference('CF', year),
            poids: Number(input.poids || 0),
            typePoisson: text(input.typePoisson),
            temperatura: optionalNumber(input.temperatura),
            observations: optionalText(input.observations),
            year,
          },
          fisherman
        );
        await this.audit(actor, 'Création commission', `Commission ${row.numero} créée`);
        return this.toCommissionView(row);
      }
      case 'camions': {
        const row = await this.repository.createTruck({
          immatriculation: text(input.immatriculation).toUpperCase(),
          marque: text(input.marque),
          modele: optionalText(input.modele),
          capacite: optionalNumber(input.capacite),
          chauffeur: optionalText(input.chauffeur),
          telephone: optionalText(input.telephone),
          statut: status(input.statut, 'ACTIF'),
          year,
        });
        await this.audit(actor, 'Création camion frigorifique', `Camion ${row.immatriculation} créé`);
        return this.toTruckView(row);
      }
      case 'expeditions': {
        const truck = this.required('camions', await this.repository.findTruck(text(input.camionId)));
        const row = await this.repository.createExpedition(
          {
            numero: reference('EXP', year),
            poids: Number(input.poids || 0),
            destination: optionalText(input.destination),
            montant: optionalNumber(input.montant),
            statut: status(input.statut, 'PLANIFIEE'),
            observations: optionalText(input.observations),
            year,
          },
          truck
        );
        await this.audit(actor, 'Création expédition', `Expédition ${row.numero} créée`);
        return this.toExpeditionView(row);
      }
    }
  }

  async update(actor: Actor, collection: QuaiCollection, id: string, input: QuaiInput) {
    switch (collection) {
      case 'pecheurs': {
        const row = await this.repository.updateFisherman(id, {
          nom: text(input.nom),
          prenom: text(input.prenom),
          telephone: optionalText(input.telephone),
          nin: optionalText(input.nin),
          adresse: optionalText(input.adresse),
          statut: status(input.statut, 'ACTIF'),
        });
        await this.audit(actor, 'Mise à jour pêcheur', `Pêcheur ${row.prenom} ${row.nom} mis à jour`);
        return this.toFishermanView(row);
      }
      case 'embarcations': {
        const owner = input.pecheurId ? await this.repository.findFisherman(String(input.pecheurId)) : null;
        const row = await this.repository.updateBoat(
          id,
          {
            nom: text(input.nom),
            immatriculation: text(input.immatriculation).toUpperCase(),
            type: text(input.type),
            taille: optionalNumber(input.taille),
            moteur: optionalText(input.moteur),
            statut: status(input.statut, 'ACTIF'),
            pecheurId: input.pecheurId ? String(input.pecheurId) : null,
          },
          owner
        );
        await this.audit(actor, 'Mise à jour embarcation', `Embarcation ${row.immatriculation} mise à jour`);
        return this.toBoatView(row);
      }
      case 'commissions': {
        const current = (await this.repository.findCommission(id)) as FishCommission;
        const row = await this.repository.updateCommission(
          id,
          {
            poids: input.poids === undefined ? current.poids : Number(input.poids),
            typePoisson: input.typePoisson ? text(input.typePoisson) : current.typePoisson,
            temperatura: input.temperatura === undefined ? current.temperatura : Number(input.temperatura),
            observations: input.observations === undefined ? current.observations : text(input.observations) || null,
            statut: input.statut ? status(input.statut, '') : current.statut,
          },
          current
        );
        await this.audit(actor, 'Mise à jour commission', `Commission ${row.numero} mise à jour`);
        return this.toCommissionView(row);
      }
      case 'camions': {
        const row = await this.repository.updateTruck(id, {
          immatriculation: text(input.immatriculation).toUpperCase(),
          marque: text(input.marque),
          modele: optionalText(input.modele),
          capacite: optionalNumber(input.capacite),
          chauffeur: optionalText(input.chauffeur),
          telephone: optionalText(input.telephone),
          statut: status(input.statut, 'ACTIF'),
        });
        await this.audit(actor, 'Mise à jour camion', `Camion ${row.immatriculation} mis à jour`);
        return this.toTruckView(row);
      }
      case 'expeditions': {
        const current = (await this.repository.findExpedition(id)) as ShippingExpedition;
        const row = await this.repository.updateExpedition(
          id,
          {
            poids: input.poids === undefined ? current.poids : Number(input.poids),
            destination: input.destination === undefined ? current.destination : text(input.destination) || null,
            montant: input.montant === undefined ? current.montant : Number(input.montant),
            statut: input.statut ? status(input.statut, '') : current.statut,
            observations: input.observations === undefined ? current.observations : text(input.observations) || null,
          },
          current
        );
        await this.audit(actor, 'Mise à jour expédition', `Expédition ${row.numero} mise à jour`);
        return this.toExpeditionView(row);
      }
    }
  }

  async delete(actor: Actor, collection: QuaiCollection, id: string) {
    await this.repository.delete(collection, id);
    await this.audit(actor, 'Suppression ressource quai', `${collection} ${id} supprimé`, 'warning');
  }

  private required<T>(collection: QuaiCollection, row: T | null): T {
    if (!row) throw new NotFoundError(NOT_FOUND_MESSAGES[collection]);
    return row;
  }

  private audit(actor: Actor, action: string, details: string, auditStatus: 'success' | 'warning' = 'success') {
    return this.auditTrail.record(actor, { action, module: 'Quai de pêche', details, status: auditStatus });
  }

  private toFishermanView(row: Fisherman) {
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

  private toBoatView(row: FishingBoat) {
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

  private toCommissionView(row: FishCommission) {
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

  private toTruckView(row: RefrigeratedTruck) {
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

  private toExpeditionView(row: ShippingExpedition) {
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
