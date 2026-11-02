export type UrbanismeCase = {
  id: string;
  numero: string;
  contribuableId: string;
  agentId: string | null;
  type: string;
  description: string | null;
  surface: number | null;
  localisation: string | null;
  nature: string | null;
  montant: number;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  contribuableNom: string;
  contribuablePrenom: string;
  contribuableNin: string;
  contribuableTelephone: string;
  contribuableAdresse: string;
  agentNom: string | null;
  agentPrenom: string | null;
};

export type UrbanismeValues = Pick<
  UrbanismeCase,
  'numero' | 'type' | 'description' | 'surface' | 'localisation' | 'nature' | 'montant' | 'statut'
>;

/** Champs dénormalisés renvoyés avec le dossier, sans relecture des jointures. */
export type UrbanismeDisplay = Pick<
  UrbanismeCase,
  | 'contribuableNom'
  | 'contribuablePrenom'
  | 'contribuableNin'
  | 'contribuableTelephone'
  | 'contribuableAdresse'
  | 'agentNom'
  | 'agentPrenom'
>;

export interface UrbanismeRepository {
  list(year: number): Promise<UrbanismeCase[]>;
  findById(id: string): Promise<UrbanismeCase | null>;
  create(
    values: UrbanismeValues & { contribuableId: string; agentId: string | null; year: number },
    display: UrbanismeDisplay
  ): Promise<UrbanismeCase>;
  update(id: string, values: UrbanismeValues, display: UrbanismeDisplay): Promise<UrbanismeCase>;
  delete(id: string): Promise<void>;
  listForStats(year: number): Promise<Array<Pick<UrbanismeCase, 'montant' | 'statut'>>>;
}
