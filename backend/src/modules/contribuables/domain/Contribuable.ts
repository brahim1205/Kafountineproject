export type Contribuable = {
  id: string;
  nin: string;
  nom: string;
  prenom: string;
  dateNaiss: Date;
  lieuNaiss: string;
  adresse: string;
  telephone: string;
  email: string | null;
  profession: string | null;
  typeContribuable: string;
  zone: string | null;
  montantImpot: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
