export type TrainingProgram = {
  id: string;
  nom: string;
  domaine: string;
  duree: string;
  responsable: string;
  budget: number;
  dateDebut: Date;
  dateFin: Date;
  statut: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  nombreInscrits: number;
  nombreCertifies: number;
};

export type YouthProfile = {
  id: string;
  nom: string;
  prenom: string;
  cni: string;
  telephone: string;
  adresse: string;
  niveauEtude: string;
  sexe: string;
  dateNaiss: Date;
  photo: string | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  formationId: string | null;
  dateInscription: Date | null;
  tauxAssiduite: number | null;
  statutFinal: string | null;
  presences: number | null;
  absences: number | null;
};

export type TrainingProgramValues = Pick<
  TrainingProgram,
  'nom' | 'domaine' | 'duree' | 'responsable' | 'budget' | 'dateDebut' | 'dateFin' | 'statut' | 'year'
>;

export type YouthProfileValues = Pick<
  YouthProfile,
  'nom' | 'prenom' | 'cni' | 'telephone' | 'adresse' | 'niveauEtude' | 'sexe' | 'dateNaiss' | 'photo' | 'year'
>;

export interface FormationRepository {
  listPrograms(year: number): Promise<TrainingProgram[]>;
  findProgramById(id: string): Promise<TrainingProgram | null>;
  createProgram(values: TrainingProgramValues): Promise<TrainingProgram>;
  updateProgram(id: string, values: TrainingProgramValues): Promise<TrainingProgram>;
  deleteProgram(id: string): Promise<void>;
  listProgramsForStats(year: number): Promise<Array<Pick<TrainingProgram, 'domaine' | 'statut' | 'budget'>>>;
  listYouthSexes(year: number): Promise<Array<Pick<YouthProfile, 'sexe'>>>;
  listEnrollmentOutcomes(year: number): Promise<Array<Pick<YouthProfile, 'statutFinal'>>>;
  listYouthWithEnrollments(year: number): Promise<YouthProfile[]>;
  existsYouthWithCniOrPhone(cni: string, telephone: string): Promise<boolean>;
  createYouth(values: YouthProfileValues): Promise<YouthProfile>;
  findYouthById(id: string): Promise<Pick<YouthProfile, 'id' | 'nom' | 'prenom'> | null>;
  deleteYouth(id: string): Promise<void>;
  existsEnrollment(jeuneId: string, formationId: string): Promise<boolean>;
  createEnrollment(jeuneId: string, formationId: string): Promise<void>;
}
