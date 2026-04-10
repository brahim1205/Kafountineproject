import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';

const yearSchema = z.coerce.number().int().min(2000).max(2100);
const uuidSchema = z.string().uuid('Identifiant invalide');
const positiveNumberSchema = z.coerce.number().positive('Valeur positive requise');
const nonNegativeNumberSchema = z.coerce.number().min(0, 'Valeur positive ou nulle requise');
const dateStringSchema = trimmedString(1, 50, 'Date invalide').refine((value) => !Number.isNaN(Date.parse(value)), 'Date invalide');
const optionalDateStringSchema = optionalTrimmedString(50).refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), 'Date invalide');
const paginationSchema = {
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(300).optional().default(20),
};

export const resourceIdParamsSchema = z.object({
  id: uuidSchema,
}).strict();

export const youthEnrollmentParamsSchema = z.object({
  id: uuidSchema,
  formationId: uuidSchema,
}).strict();

export const publicIdParamsSchema = z.object({
  publicId: trimmedString(1, 120, 'Identifiant image invalide'),
}).strict();

export const backupFilenameParamsSchema = z.object({
  filename: trimmedString(1, 255, 'Nom de fichier invalide'),
}).strict();

export const yearQuerySchema = z.object({
  year: yearSchema.optional(),
}).strict();

export const yearLimitQuerySchema = z.object({
  year: yearSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
}).strict();

export const yearSearchLimitQuerySchema = z.object({
  year: yearSchema.optional(),
  search: optionalTrimmedString(120),
  limit: z.coerce.number().int().min(1).max(500).optional(),
}).strict();

export const urbanismeListQuerySchema = z.object({
  ...paginationSchema,
  year: yearSchema.optional(),
  statut: optionalTrimmedString(40),
}).strict();

export const auditListQuerySchema = z.object({
  ...paginationSchema,
  year: yearSchema.optional(),
  search: optionalTrimmedString(160),
  module: optionalTrimmedString(120),
  statut: optionalTrimmedString(40),
}).strict();

export const createUserSchema = z.object({
  email: trimmedString(5, 254, 'Email invalide').email('Email invalide').transform((value) => value.toLowerCase()),
  nom: trimmedString(1, 100, 'Nom requis'),
  prenom: trimmedString(1, 100, 'Prénom requis'),
  role: z.enum(['ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES', 'QUAI_PECHE']).optional(),
  telephone: optionalTrimmedString(20),
  password: trimmedString(12, 128, 'Mot de passe invalide'),
}).strict();

export const updateUserSchema = z.object({
  email: trimmedString(5, 254, 'Email invalide').email('Email invalide').transform((value) => value.toLowerCase()).optional(),
  nom: optionalTrimmedString(100),
  prenom: optionalTrimmedString(100),
  role: z.enum(['ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES', 'QUAI_PECHE']).optional(),
  telephone: optionalTrimmedString(20),
  password: trimmedString(12, 128, 'Mot de passe invalide').optional(),
  isActive: z.boolean().optional(),
}).strict();

export const createFormationSchema = z.object({
  nom: trimmedString(1, 120, 'Nom requis'),
  domaine: trimmedString(1, 120, 'Domaine requis'),
  duree: trimmedString(1, 60, 'Durée requise'),
  responsable: trimmedString(1, 120, 'Responsable requis'),
  budget: nonNegativeNumberSchema,
  dateDebut: dateStringSchema,
  dateFin: dateStringSchema,
  statut: z.enum(['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE']).optional(),
  year: yearSchema.optional(),
}).strict();

export const updateFormationSchema = z.object({
  nom: optionalTrimmedString(120),
  domaine: optionalTrimmedString(120),
  duree: optionalTrimmedString(60),
  responsable: optionalTrimmedString(120),
  budget: nonNegativeNumberSchema.optional(),
  dateDebut: optionalDateStringSchema,
  dateFin: optionalDateStringSchema,
  statut: z.enum(['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE']).optional(),
  year: yearSchema.optional(),
}).strict();

export const createYouthSchema = z.object({
  nom: trimmedString(1, 100, 'Nom requis'),
  prenom: trimmedString(1, 100, 'Prénom requis'),
  cni: trimmedString(1, 50, 'CNI requis'),
  telephone: trimmedString(1, 20, 'Téléphone requis'),
  adresse: optionalTrimmedString(255),
  niveauEtude: optionalTrimmedString(120),
  sexe: z.enum(['M', 'F', 'AUTRE']),
  dateNaiss: dateStringSchema,
  photo: optionalTrimmedString(255),
  year: yearSchema.optional(),
}).strict();

export const createEtatCivilSchema = z.object({
  contribuableId: uuidSchema,
  typeDocument: trimmedString(1, 120, 'Type de document requis'),
  exemplaires: z.coerce.number().int().min(1, 'Nombre d’exemplaires invalide'),
  montant: nonNegativeNumberSchema,
  statut: z.enum(['DELIVREE', 'REJETEE', 'EN_ATTENTE', 'VALIDE', 'REJETE']).optional(),
  observations: optionalTrimmedString(500),
  year: yearSchema.optional(),
}).strict();

export const updateEtatCivilSchema = z.object({
  typeDocument: optionalTrimmedString(120),
  exemplaires: z.coerce.number().int().min(1, 'Nombre d’exemplaires invalide').optional(),
  montant: nonNegativeNumberSchema.optional(),
  statut: z.enum(['DELIVREE', 'REJETEE', 'EN_ATTENTE', 'VALIDE', 'REJETE']).optional(),
  observations: optionalTrimmedString(500),
}).strict();

export const createUrbanismeSchema = z.object({
  contribuableId: uuidSchema,
  type: trimmedString(1, 120, 'Type requis'),
  description: optionalTrimmedString(500),
  surface: nonNegativeNumberSchema.optional(),
  localisation: optionalTrimmedString(255),
  nature: optionalTrimmedString(120),
  montant: nonNegativeNumberSchema.optional(),
  statut: z.enum(['EN_ATTENTE', 'VALIDE', 'REJETE']).optional(),
  year: yearSchema.optional(),
}).strict();

export const updateUrbanismeSchema = z.object({
  type: optionalTrimmedString(120),
  description: optionalTrimmedString(500),
  surface: nonNegativeNumberSchema.optional(),
  localisation: optionalTrimmedString(255),
  nature: optionalTrimmedString(120),
  montant: nonNegativeNumberSchema.optional(),
  statut: z.enum(['EN_ATTENTE', 'VALIDE', 'REJETE']).optional(),
  year: yearSchema.optional(),
}).strict();

export const createMarketPlaceSchema = z.object({
  numeroPlace: trimmedString(1, 50, 'Numéro requis').optional(),
  numero: trimmedString(1, 50, 'Numéro requis').optional(),
  type: trimmedString(1, 80, 'Type requis'),
  zone: trimmedString(1, 80, 'Zone requise'),
  occupantId: uuidSchema.optional(),
  activite: optionalTrimmedString(120),
  telephone: optionalTrimmedString(20),
  tarif: nonNegativeNumberSchema,
  periode: optionalTrimmedString(40),
  statut: z.enum(['LIBRE', 'OCCUPEE', 'DISPONIBLE']).optional(),
  year: yearSchema.optional(),
}).strict().refine((value) => Boolean(value.numeroPlace || value.numero), {
  message: 'Le numéro de place est requis',
  path: ['numeroPlace'],
});

export const updateMarketPlaceSchema = z.object({
  numeroPlace: optionalTrimmedString(50),
  type: optionalTrimmedString(80),
  zone: optionalTrimmedString(80),
  occupantId: uuidSchema.optional().or(z.literal('')).transform((value) => value || undefined),
  activite: optionalTrimmedString(120),
  telephone: optionalTrimmedString(20),
  tarif: nonNegativeNumberSchema.optional(),
  periode: optionalTrimmedString(40),
  statut: z.enum(['LIBRE', 'OCCUPEE', 'DISPONIBLE']).optional(),
  year: yearSchema.optional(),
}).strict();

export const createMarketPaymentSchema = z.object({
  placeId: uuidSchema,
  montant: positiveNumberSchema,
  reference: optionalTrimmedString(120),
  periode: trimmedString(1, 80, 'Période requise'),
  statut: z.enum(['PAYE', 'EN_ATTENTE', 'ANNULE']).optional(),
  datePaiement: optionalDateStringSchema,
  year: yearSchema.optional(),
}).strict();

export const createMotoSchema = z.object({
  matricule: trimmedString(1, 50, 'Matricule requis'),
  marque: trimmedString(1, 80, 'Marque requise'),
  modele: trimmedString(1, 80, 'Modèle requis'),
  annee: z.coerce.number().int().min(1900).max(2100),
  couleur: optionalTrimmedString(40),
  proprietaireId: uuidSchema,
  conducteurId: uuidSchema.optional(),
  permis: optionalTrimmedString(80),
  statut: optionalTrimmedString(40),
  photo: optionalTrimmedString(255),
  enRetard: z.boolean().optional(),
  montantPenalite: nonNegativeNumberSchema.optional(),
  prochainPaiement: optionalDateStringSchema,
  dernierPaiement: optionalDateStringSchema,
  year: yearSchema.optional(),
}).strict();

export const updateMotoSchema = z.object({
  matricule: optionalTrimmedString(50),
  marque: optionalTrimmedString(80),
  modele: optionalTrimmedString(80),
  annee: z.coerce.number().int().min(1900).max(2100).optional(),
  couleur: optionalTrimmedString(40),
  proprietaireId: uuidSchema.optional(),
  conducteurId: uuidSchema.optional(),
  permis: optionalTrimmedString(80),
  statut: optionalTrimmedString(40),
  photo: optionalTrimmedString(255),
  enRetard: z.boolean().optional(),
  montantPenalite: nonNegativeNumberSchema.optional(),
  prochainPaiement: optionalDateStringSchema,
  dernierPaiement: optionalDateStringSchema,
  year: yearSchema.optional(),
}).strict();

export const changeMotoDriverSchema = z.object({
  conducteurId: uuidSchema,
}).strict();

export const createMotoPaymentSchema = z.object({
  motoId: uuidSchema,
  montant: positiveNumberSchema,
  reference: optionalTrimmedString(120),
  mois: optionalTrimmedString(80),
  year: yearSchema.optional(),
}).strict();

export const auditExportSchema = z.object({
  year: yearSchema.optional(),
}).strict();

export const markAllReadQuerySchema = z.object({
  year: yearSchema.optional(),
}).strict();

export const createFishermanSchema = z.object({
  nom: trimmedString(1, 100, 'Nom requis'),
  prenom: trimmedString(1, 100, 'Prénom requis'),
  telephone: optionalTrimmedString(20),
  nin: optionalTrimmedString(30),
  adresse: optionalTrimmedString(255),
  statut: optionalTrimmedString(40),
  year: yearSchema.optional(),
}).strict();

export const updateFishermanSchema = createFishermanSchema.partial().strict();

export const createFishingBoatSchema = z.object({
  nom: trimmedString(1, 120, 'Nom requis'),
  immatriculation: trimmedString(1, 60, 'Immatriculation requise'),
  type: trimmedString(1, 80, 'Type requis'),
  taille: nonNegativeNumberSchema.optional(),
  moteur: optionalTrimmedString(120),
  statut: optionalTrimmedString(40),
  pecheurId: uuidSchema.optional(),
  year: yearSchema.optional(),
}).strict();

export const updateFishingBoatSchema = createFishingBoatSchema.partial().strict();

export const createFishCommissionSchema = z.object({
  pecheurId: uuidSchema,
  poids: positiveNumberSchema,
  typePoisson: trimmedString(1, 120, 'Type de poisson requis'),
  temperatura: z.coerce.number().optional(),
  observations: optionalTrimmedString(500),
  statut: optionalTrimmedString(40),
  year: yearSchema.optional(),
}).strict();

export const updateFishCommissionSchema = z.object({
  poids: positiveNumberSchema.optional(),
  typePoisson: optionalTrimmedString(120),
  temperatura: z.coerce.number().optional(),
  observations: optionalTrimmedString(500),
  statut: optionalTrimmedString(40),
}).strict();

export const createTruckSchema = z.object({
  immatriculation: trimmedString(1, 60, 'Immatriculation requise'),
  marque: trimmedString(1, 80, 'Marque requise'),
  modele: optionalTrimmedString(80),
  capacite: nonNegativeNumberSchema.optional(),
  chauffeur: optionalTrimmedString(120),
  telephone: optionalTrimmedString(20),
  statut: optionalTrimmedString(40),
  year: yearSchema.optional(),
}).strict();

export const updateTruckSchema = createTruckSchema.partial().strict();

export const createExpeditionSchema = z.object({
  camionId: uuidSchema,
  poids: positiveNumberSchema,
  destination: optionalTrimmedString(120),
  montant: nonNegativeNumberSchema.optional(),
  statut: optionalTrimmedString(40),
  observations: optionalTrimmedString(500),
  year: yearSchema.optional(),
}).strict();

export const updateExpeditionSchema = z.object({
  poids: positiveNumberSchema.optional(),
  destination: optionalTrimmedString(120),
  montant: nonNegativeNumberSchema.optional(),
  statut: optionalTrimmedString(40),
  observations: optionalTrimmedString(500),
}).strict();

export const createTarifSchema = z.object({
  categorie: trimmedString(1, 100, 'Catégorie requise'),
  nom: trimmedString(1, 120, 'Nom requis'),
  montant: nonNegativeNumberSchema,
  unite: trimmedString(1, 80, 'Unité requise'),
  description: optionalTrimmedString(255),
  actif: z.boolean().optional(),
}).strict();

export const updateTarifSchema = z.object({
  categorie: optionalTrimmedString(100),
  nom: optionalTrimmedString(120),
  montant: nonNegativeNumberSchema.optional(),
  unite: optionalTrimmedString(80),
  description: optionalTrimmedString(255),
  actif: z.boolean().optional(),
}).strict();

export const createPenaltySchema = z.object({
  type: trimmedString(1, 120, 'Type requis'),
  description: optionalTrimmedString(255),
  montant: nonNegativeNumberSchema,
  delai: trimmedString(1, 120, 'Délai requis'),
  actif: z.boolean().optional(),
}).strict();

export const updatePenaltySchema = z.object({
  type: optionalTrimmedString(120),
  description: optionalTrimmedString(255),
  montant: nonNegativeNumberSchema.optional(),
  delai: optionalTrimmedString(120),
  actif: z.boolean().optional(),
}).strict();

export const updatePermissionSchema = z.object({
  module: trimmedString(1, 120, 'Module requis'),
  role: z.enum(['AGENT', 'SUPERVISEUR', 'COMPTABLE', 'ADMIN', 'SUPER_ADMIN']),
  enabled: z.boolean(),
}).strict();

export const createBackupSchema = z.object({}).strict();

export const restoreBackupSchema = z.object({
  filename: trimmedString(1, 255, 'Nom du fichier requis'),
}).strict();

export const exportReceiptPdfSchema = z.object({
  ticketNumber: trimmedString(1, 120, 'Numéro requis'),
  date: trimmedString(1, 80, 'Date requise'),
  time: trimmedString(1, 20, 'Heure requise'),
  contributor: trimmedString(1, 160, 'Contribuable requis'),
  type: trimmedString(1, 160, 'Type requis'),
  amount: positiveNumberSchema,
  agent: optionalTrimmedString(120),
  telephone: optionalTrimmedString(20),
  nin: optionalTrimmedString(40),
  adresse: optionalTrimmedString(255),
}).strict();

export const exportReportPdfSchema = z.object({
  year: yearSchema,
  total: nonNegativeNumberSchema,
  tauxRecouvrement: nonNegativeNumberSchema,
  totalTransactions: z.coerce.number().int().min(0),
  totalContribuables: z.coerce.number().int().min(0),
  modules: z.array(z.object({
    name: trimmedString(1, 120, 'Module invalide'),
    amount: nonNegativeNumberSchema,
    evolution: z.coerce.number().optional(),
  }).strict()).max(50),
  topContribuables: z.array(z.object({
    name: trimmedString(1, 160, 'Contribuable invalide'),
    amount: nonNegativeNumberSchema,
  }).strict()).max(100),
}).strict();

export const createBudgetLineSchema = z.object({
  code: trimmedString(1, 40, 'Code requis'),
  libelle: trimmedString(1, 160, 'Libellé requis'),
  description: optionalTrimmedString(255),
  prevu: nonNegativeNumberSchema,
  depense: nonNegativeNumberSchema.optional(),
  year: yearSchema.optional(),
}).strict();

export const updateBudgetLineSchema = z.object({
  code: optionalTrimmedString(40),
  libelle: optionalTrimmedString(160),
  description: optionalTrimmedString(255),
  prevu: nonNegativeNumberSchema.optional(),
  depense: nonNegativeNumberSchema.optional(),
  year: yearSchema.optional(),
}).strict();

export const createBudgetRequestSchema = z.object({
  service: trimmedString(1, 120, 'Service requis'),
  description: trimmedString(1, 255, 'Description requise'),
  montant: positiveNumberSchema,
  year: yearSchema.optional(),
}).strict();

export const updateBudgetRequestSchema = z.object({
  service: optionalTrimmedString(120),
  description: optionalTrimmedString(255),
  montant: positiveNumberSchema.optional(),
  statut: optionalTrimmedString(40),
  motif: optionalTrimmedString(255),
}).strict();
