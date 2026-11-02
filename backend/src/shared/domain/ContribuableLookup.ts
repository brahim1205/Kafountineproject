export type ContribuableSummary = {
  id: string;
  nom: string;
  prenom: string;
  nin: string;
  telephone: string;
  adresse: string;
};

export interface ContribuableLookup {
  findById(id: string): Promise<ContribuableSummary | null>;
}
