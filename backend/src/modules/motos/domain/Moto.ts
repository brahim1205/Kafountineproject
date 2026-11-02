export type MotoRegistration = {
  id: string;
  matricule: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string | null;
  proprietaireId: string;
  conducteurId: string | null;
  permis: string | null;
  statut: string;
  photo: string | null;
  enRetard: boolean;
  montantPenalite: number;
  prochainPaiement: Date | null;
  dernierPaiement: Date | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  proprietaireNom: string;
  proprietairePrenom: string;
  proprietaireNin: string;
  proprietaireTelephone: string;
  conducteurNom: string | null;
  conducteurPrenom: string | null;
  conducteurNin: string | null;
  conducteurTelephone: string | null;
};

export type MotoPayment = {
  id: string;
  motoId: string;
  montant: number;
  reference: string | null;
  statut: string;
  datePaiement: Date | null;
  mois: string | null;
  numeroRecu: string | null;
  agent: string | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  matricule: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string | null;
  proprietaireId: string;
  conducteurId: string | null;
  permis: string | null;
  motoStatut: string;
  photo: string | null;
  enRetard: boolean;
  montantPenalite: number;
  prochainPaiement: Date | null;
  dernierPaiement: Date | null;
  proprietaireNom: string;
  proprietairePrenom: string;
  proprietaireNin: string;
  proprietaireTelephone: string;
  conducteurNom: string | null;
  conducteurPrenom: string | null;
  conducteurNin: string | null;
  conducteurTelephone: string | null;
};

export type MotoValues = Pick<
  MotoRegistration,
  | 'matricule'
  | 'marque'
  | 'modele'
  | 'annee'
  | 'couleur'
  | 'proprietaireId'
  | 'conducteurId'
  | 'permis'
  | 'statut'
  | 'photo'
  | 'enRetard'
  | 'montantPenalite'
  | 'prochainPaiement'
  | 'dernierPaiement'
  | 'year'
>;

export type MotoPeopleDisplay = Pick<
  MotoRegistration,
  | 'proprietaireNom'
  | 'proprietairePrenom'
  | 'proprietaireNin'
  | 'proprietaireTelephone'
  | 'conducteurNom'
  | 'conducteurPrenom'
  | 'conducteurNin'
  | 'conducteurTelephone'
>;

export type MotoPaymentValues = Pick<MotoPayment, 'motoId' | 'montant' | 'reference' | 'mois' | 'numeroRecu' | 'agent' | 'year'> & {
  datePaiement: Date;
  prochainPaiement: Date;
};

export interface MotoRepository {
  list(year: number): Promise<MotoRegistration[]>;
  findById(id: string): Promise<MotoRegistration | null>;
  findIdByMatricule(matricule: string): Promise<string | null>;
  findIdByPermis(permis: string): Promise<string | null>;
  create(values: MotoValues, people: MotoPeopleDisplay): Promise<MotoRegistration>;
  update(id: string, values: MotoValues, people: MotoPeopleDisplay): Promise<MotoRegistration>;
  listForStats(year: number): Promise<Array<Pick<MotoRegistration, 'enRetard' | 'statut'>>>;
  listPaymentAmounts(year: number): Promise<Array<Pick<MotoPayment, 'montant'>>>;
  listPayments(year: number): Promise<MotoPayment[]>;
  createPayment(values: MotoPaymentValues, moto: MotoRegistration): Promise<MotoPayment>;
  markPaid(motoId: string, paidAt: Date, nextDueDate: Date): Promise<void>;
}
