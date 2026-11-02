import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { nonNegativeNumberSchema, positiveNumberSchema, uuidSchema, yearSchema } from '../../../shared/validation/commonSchemas';

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
