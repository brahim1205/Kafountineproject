export type EtatCivilRequest = {
  id: string;
  numero: string;
  contribuableId: string;
  agentId: string | null;
  typeDocument: string;
  exemplaires: number;
  montant: number;
  statut: string;
  observations: string | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  contribuableNom: string;
  contribuablePrenom: string;
  contribuableNin: string;
  contribuableTelephone: string;
  agentNom: string | null;
  agentPrenom: string | null;
};

export type EtatCivilValues = Pick<
  EtatCivilRequest,
  'contribuableId' | 'typeDocument' | 'exemplaires' | 'montant' | 'statut' | 'observations'
>;

/** Champs dénormalisés renvoyés avec la demande, sans relecture des jointures. */
export type EtatCivilDisplay = Pick<
  EtatCivilRequest,
  'contribuableNom' | 'contribuablePrenom' | 'contribuableNin' | 'contribuableTelephone' | 'agentNom' | 'agentPrenom'
>;

export interface EtatCivilRepository {
  list(year: number): Promise<EtatCivilRequest[]>;
  findById(id: string): Promise<EtatCivilRequest | null>;
  create(
    values: EtatCivilValues & { numero: string; agentId: string | null; year: number },
    display: EtatCivilDisplay
  ): Promise<EtatCivilRequest>;
  update(id: string, values: EtatCivilValues, display: EtatCivilDisplay): Promise<EtatCivilRequest>;
  delete(id: string): Promise<void>;
  listForStats(year: number): Promise<Array<Pick<EtatCivilRequest, 'montant' | 'statut'>>>;
}
