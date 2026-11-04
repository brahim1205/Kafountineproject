export type MarketPlace = {
  id: string;
  numeroPlace: string;
  type: string;
  zone: string;
  occupantId: string | null;
  activite: string | null;
  telephone: string | null;
  dateAttribution: Date | null;
  tarif: number;
  periode: string;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  occupantNom: string | null;
  occupantPrenom: string | null;
  occupantNin: string | null;
  occupantTelephone: string | null;
};

export type MarketPayment = {
  id: string;
  placeId: string;
  montant: number;
  reference: string | null;
  periode: string;
  statut: string;
  datePaiement: Date | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  numeroPlace: string;
  placeType: string;
  placeZone: string;
  occupantId: string | null;
  activite: string | null;
  tarif: number;
  placePeriode: string;
  placeStatut: string;
  placeTelephone: string | null;
  placeDateAttribution: Date | null;
  occupantNom: string | null;
  occupantPrenom: string | null;
  occupantNin: string | null;
  occupantTelephone: string | null;
};

export type MarketPlaceValues = Pick<
  MarketPlace,
  'numeroPlace' | 'type' | 'zone' | 'occupantId' | 'activite' | 'telephone' | 'dateAttribution' | 'tarif' | 'periode' | 'statut' | 'year'
>;

export type OccupantDisplay = Pick<MarketPlace, 'occupantNom' | 'occupantPrenom' | 'occupantNin' | 'occupantTelephone'>;

export interface MarcheRepository {
  listPlaces(year: number): Promise<MarketPlace[]>;
  findPlaceById(id: string): Promise<MarketPlace | null>;
  findPlaceIdByNumero(numeroPlace: string, year: number): Promise<string | null>;
  createPlace(values: MarketPlaceValues, occupant: OccupantDisplay): Promise<MarketPlace>;
  updatePlace(id: string, values: MarketPlaceValues, occupant: OccupantDisplay): Promise<MarketPlace>;
  listPayments(year: number): Promise<MarketPayment[]>;
  createPayment(
    values: Pick<MarketPayment, 'placeId' | 'montant' | 'reference' | 'periode' | 'statut' | 'year'> & { datePaiement: Date },
    place: MarketPlace
  ): Promise<MarketPayment>;
  findPaymentsForPeriod(placeId: string, periode: string, year: number): Promise<Array<Pick<MarketPayment, 'id' | 'statut'>>>;
  /** Encaisse un paiement existant (en attente ou en retard) au lieu d'en créer un second. */
  settlePayment(
    id: string,
    values: Pick<MarketPayment, 'montant' | 'reference'> & { datePaiement: Date },
    place: MarketPlace
  ): Promise<MarketPayment>;
  listPlacesForStats(year: number): Promise<Array<Pick<MarketPlace, 'statut' | 'occupantId'>>>;
  listPaymentsForStats(year: number): Promise<Array<Pick<MarketPayment, 'montant' | 'statut'>>>;
}
