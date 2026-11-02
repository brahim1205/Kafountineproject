import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { ContribuableLookup, ContribuableSummary } from '../../../shared/domain/ContribuableLookup';
import type { MarcheRepository, MarketPayment, MarketPlace, OccupantDisplay } from '../domain/Marche';

export type MarketPlaceInput = {
  numeroPlace?: string;
  numero?: string;
  type?: string;
  zone?: string;
  occupantId?: string | null;
  activite?: string;
  tarif?: number;
  periode?: string;
  statut?: string;
  year?: number;
};

export type MarketPaymentInput = {
  placeId?: string;
  montant?: number;
  reference?: string;
  periode?: string;
  statut?: string;
  datePaiement?: string;
  year?: number;
};

export function normalizeMarketPlaceStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'OCCUPEE' || normalized === 'LIBRE' || normalized === 'DISPONIBLE') {
    return normalized === 'DISPONIBLE' ? 'LIBRE' : normalized;
  }
  return 'LIBRE';
}

function occupantDisplay(occupant: ContribuableSummary | null): OccupantDisplay {
  return {
    occupantNom: occupant?.nom || null,
    occupantPrenom: occupant?.prenom || null,
    occupantNin: occupant?.nin || null,
    occupantTelephone: occupant?.telephone || null,
  };
}

export class MarcheService {
  constructor(
    private readonly repository: MarcheRepository,
    private readonly contribuables: ContribuableLookup,
    private readonly auditTrail: AuditTrail
  ) {}

  async listPlaces(year: number) {
    const rows = await this.repository.listPlaces(year);
    return rows.map((row) => this.toPlaceView(row));
  }

  async createPlace(actor: Actor, input: MarketPlaceInput) {
    const numeroPlace = String(input.numeroPlace || input.numero || '').trim();
    const type = String(input.type || '').trim();
    const zone = String(input.zone || '').trim();
    const tarif = Number(input.tarif || 0);
    const periode = String(input.periode || 'mensuel').trim();
    const statut = normalizeMarketPlaceStatus(String(input.statut || 'LIBRE'));
    const occupantId = input.occupantId ? String(input.occupantId).trim() : null;

    if (!numeroPlace || !type || !zone) {
      throw new ValidationError('Le numéro, le type et la zone de la place sont requis.');
    }

    if (Number.isNaN(tarif) || tarif < 0) {
      throw new ValidationError('Le tarif de la place est invalide.');
    }

    const year = input.year ? Number(input.year) : new Date().getFullYear();
    if (await this.repository.findPlaceIdByNumero(numeroPlace, year)) {
      throw new ConflictError('Une place avec ce numéro existe déjà pour cette année.');
    }

    const occupant = await this.findOccupant(occupantId);

    const created = await this.repository.createPlace(
      {
        numeroPlace,
        type,
        zone,
        occupantId,
        activite: input.activite ? String(input.activite).trim() : null,
        telephone: occupant?.telephone || null,
        dateAttribution: occupantId ? new Date() : null,
        tarif,
        periode,
        statut,
        year,
      },
      occupantDisplay(occupant)
    );

    await this.auditTrail.record(actor, {
      action: 'Création place marché',
      module: 'Marché',
      details: `Place ${created.numeroPlace} créée (${created.type})`,
    });

    return this.toPlaceView(created);
  }

  async updatePlace(actor: Actor, placeId: string, input: MarketPlaceInput) {
    const existing = await this.repository.findPlaceById(placeId);
    if (!existing) {
      throw new NotFoundError('Place de marché introuvable.');
    }

    const nextNumero = input.numeroPlace ? String(input.numeroPlace).trim() : existing.numeroPlace;
    const nextYear = input.year ? Number(input.year) : existing.year;
    if (nextNumero !== existing.numeroPlace || nextYear !== existing.year) {
      const duplicateId = await this.repository.findPlaceIdByNumero(nextNumero, nextYear);
      if (duplicateId && duplicateId !== existing.id) {
        throw new ConflictError('Une place avec ce numéro existe déjà pour cette année.');
      }
    }

    const occupantId = input.occupantId === undefined ? existing.occupantId : String(input.occupantId || '').trim() || null;
    const occupant = await this.findOccupant(occupantId);
    const liberee = existing.occupantId !== null && occupantId === null;

    const updated = await this.repository.updatePlace(
      placeId,
      {
        numeroPlace: nextNumero,
        type: input.type ? String(input.type).trim() : existing.type,
        zone: input.zone ? String(input.zone).trim() : existing.zone,
        occupantId,
        activite: liberee ? null : input.activite === undefined ? existing.activite : String(input.activite || '').trim() || null,
        telephone: liberee ? null : occupant?.telephone || existing.telephone,
        dateAttribution: occupantId ? existing.dateAttribution || new Date() : null,
        tarif: input.tarif === undefined ? existing.tarif : Number(input.tarif),
        periode: input.periode ? String(input.periode).trim() : existing.periode,
        statut: input.statut ? normalizeMarketPlaceStatus(String(input.statut)) : existing.statut,
        year: nextYear,
      },
      occupantDisplay(occupant)
    );

    await this.auditTrail.record(actor, {
      action: 'Mise à jour place marché',
      module: 'Marché',
      details: `Place ${updated.numeroPlace} mise à jour`,
    });

    return this.toPlaceView(updated);
  }

  async listPayments(year: number) {
    const rows = await this.repository.listPayments(year);
    return rows.map((row) => this.toPaymentView(row));
  }

  async createPayment(actor: Actor, input: MarketPaymentInput) {
    const placeId = String(input.placeId || '').trim();
    const periode = String(input.periode || '').trim();
    const montant = Number(input.montant || 0);
    const reference = input.reference ? String(input.reference).trim() : null;

    if (!placeId || !periode) {
      throw new ValidationError('La place et la période de paiement sont requises.');
    }

    if (Number.isNaN(montant) || montant <= 0) {
      throw new ValidationError('Le montant du paiement marché est invalide.');
    }

    const place = await this.repository.findPlaceById(placeId);
    if (!place) {
      throw new NotFoundError('Place de marché introuvable.');
    }

    const year = input.year ? Number(input.year) : new Date().getFullYear();
    const created = await this.repository.createPayment(
      {
        placeId,
        montant,
        reference,
        periode,
        statut: input.statut || 'PAYE',
        datePaiement: input.datePaiement ? new Date(input.datePaiement) : new Date(),
        year,
      },
      place
    );

    await this.auditTrail.record(actor, {
      action: 'Paiement marché',
      module: 'Marché',
      details: `Paiement enregistré pour la place ${place.numeroPlace} (${montant} FCFA)`,
    });

    return this.toPaymentView(created);
  }

  async stats(year: number) {
    const [places, paiements] = await Promise.all([
      this.repository.listPlacesForStats(year),
      this.repository.listPaymentsForStats(year),
    ]);
    const placesTotales = places.length;
    const placesOccupees = places.filter((item) => item.statut === 'OCCUPEE').length;
    const total = (items: typeof paiements) => items.reduce((sum, item) => sum + Number(item.montant || 0), 0);
    return {
      placesTotales,
      placesOccupees,
      placesDisponibles: Math.max(placesTotales - placesOccupees, 0),
      // Seuls les paiements encaissés sont des recettes ; les paiements annulés ne comptent nulle part.
      recettesMois: total(paiements.filter((item) => item.statut === 'PAYE')),
      tauxOccupation: placesTotales > 0 ? Math.round((placesOccupees / placesTotales) * 100) : 0,
      nouveauxCommercants: places.filter((item) => item.occupantId).length,
      recettesEnRetard: total(paiements.filter((item) => item.statut !== 'PAYE' && item.statut !== 'ANNULE')),
    };
  }

  private async findOccupant(occupantId: string | null) {
    if (!occupantId) {
      return null;
    }
    const occupant = await this.contribuables.findById(occupantId);
    if (!occupant) {
      throw new NotFoundError('Occupant introuvable.');
    }
    return occupant;
  }

  private toPlaceView(row: MarketPlace) {
    const occupantName = row.occupantPrenom && row.occupantNom ? `${row.occupantPrenom} ${row.occupantNom}`.trim() : null;
    return {
      id: row.id,
      numeroPlace: row.numeroPlace,
      numero: row.numeroPlace,
      type: row.type,
      zone: row.zone,
      occupantId: row.occupantId,
      occupant: occupantName,
      telephone: row.telephone || row.occupantTelephone,
      dateAttribution: row.dateAttribution ? row.dateAttribution.toISOString() : null,
      activite: row.activite || null,
      tarif: Number(row.tarif || 0),
      periode: row.periode,
      statut: row.statut,
    };
  }

  private toPaymentView(row: MarketPayment) {
    return {
      id: row.id,
      placeId: row.placeId,
      montant: Number(row.montant || 0),
      reference: row.reference || undefined,
      periode: row.periode,
      statut: row.statut,
      datePaiement: row.datePaiement ? row.datePaiement.toISOString() : null,
      place: this.toPlaceView({
        id: row.placeId,
        numeroPlace: row.numeroPlace,
        type: row.placeType,
        zone: row.placeZone,
        occupantId: row.occupantId,
        activite: row.activite,
        telephone: row.placeTelephone,
        dateAttribution: row.placeDateAttribution,
        tarif: row.tarif,
        periode: row.placePeriode,
        statut: row.placeStatut,
        year: row.year,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        occupantNom: row.occupantNom,
        occupantPrenom: row.occupantPrenom,
        occupantNin: row.occupantNin,
        occupantTelephone: row.occupantTelephone,
      }),
    };
  }
}
