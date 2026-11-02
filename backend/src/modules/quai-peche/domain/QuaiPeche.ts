export type QuaiCollection = 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions';

export type Fisherman = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  nin: string | null;
  adresse: string | null;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  embarcationsCount: number;
  commissionsCount: number;
};

export type FishingBoat = {
  id: string;
  nom: string;
  immatriculation: string;
  type: string;
  taille: number | null;
  moteur: string | null;
  statut: string;
  pecheurId: string | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  pecheurNom: string | null;
  pecheurPrenom: string | null;
  pecheurTelephone: string | null;
  pecheurNin: string | null;
};

export type FishCommission = {
  id: string;
  numero: string;
  poids: number;
  typePoisson: string;
  temperatura: number | null;
  observations: string | null;
  statut: string;
  date: Date;
  pecheurId: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  pecheurNom: string;
  pecheurPrenom: string;
  pecheurTelephone: string | null;
  pecheurNin: string | null;
};

export type RefrigeratedTruck = {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string | null;
  capacite: number | null;
  chauffeur: string | null;
  telephone: string | null;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  expeditionsCount: number;
};

export type ShippingExpedition = {
  id: string;
  numero: string;
  date: Date;
  poids: number;
  destination: string | null;
  montant: number | null;
  statut: string;
  observations: string | null;
  camionId: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  camionImmatriculation: string;
  camionMarque: string;
  camionModele: string | null;
  camionCapacite: number | null;
  camionChauffeur: string | null;
  camionTelephone: string | null;
  camionStatut: string;
};

export type FishermanValues = Pick<Fisherman, 'nom' | 'prenom' | 'telephone' | 'nin' | 'adresse' | 'statut'>;
export type FishingBoatValues = Pick<FishingBoat, 'nom' | 'immatriculation' | 'type' | 'taille' | 'moteur' | 'statut' | 'pecheurId'>;
export type FishCommissionValues = Pick<FishCommission, 'poids' | 'typePoisson' | 'temperatura' | 'observations' | 'statut'>;
export type TruckValues = Pick<RefrigeratedTruck, 'immatriculation' | 'marque' | 'modele' | 'capacite' | 'chauffeur' | 'telephone' | 'statut'>;
export type ExpeditionValues = Pick<ShippingExpedition, 'poids' | 'destination' | 'montant' | 'statut' | 'observations'>;

export interface QuaiPecheRepository {
  listFishermen(year: number): Promise<Fisherman[]>;
  findFisherman(id: string): Promise<Fisherman | null>;
  createFisherman(values: FishermanValues & { year: number }): Promise<Fisherman>;
  updateFisherman(id: string, values: FishermanValues): Promise<Fisherman>;

  listBoats(year: number): Promise<FishingBoat[]>;
  findBoat(id: string): Promise<FishingBoat | null>;
  createBoat(values: FishingBoatValues & { year: number }, owner: Fisherman | null): Promise<FishingBoat>;
  updateBoat(id: string, values: FishingBoatValues, owner: Fisherman | null): Promise<FishingBoat>;

  listCommissions(year: number): Promise<FishCommission[]>;
  findCommission(id: string): Promise<FishCommission | null>;
  createCommission(
    values: Omit<FishCommissionValues, 'statut'> & { numero: string; year: number },
    fisherman: Fisherman
  ): Promise<FishCommission>;
  updateCommission(id: string, values: FishCommissionValues, current: FishCommission): Promise<FishCommission>;

  listTrucks(year: number): Promise<RefrigeratedTruck[]>;
  findTruck(id: string): Promise<RefrigeratedTruck | null>;
  createTruck(values: TruckValues & { year: number }): Promise<RefrigeratedTruck>;
  updateTruck(id: string, values: TruckValues): Promise<RefrigeratedTruck>;

  listExpeditions(year: number): Promise<ShippingExpedition[]>;
  findExpedition(id: string): Promise<ShippingExpedition | null>;
  createExpedition(
    values: ExpeditionValues & { numero: string; year: number },
    truck: RefrigeratedTruck
  ): Promise<ShippingExpedition>;
  updateExpedition(id: string, values: ExpeditionValues, current: ShippingExpedition): Promise<ShippingExpedition>;

  delete(collection: QuaiCollection, id: string): Promise<void>;

  listCommissionWeights(year: number): Promise<Array<Pick<FishCommission, 'poids' | 'statut'>>>;
  countActiveFishermen(year: number): Promise<number>;
  countBoats(year: number): Promise<number>;
}
