import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { dateStringSchema, nonNegativeNumberSchema, optionalDateStringSchema, uuidSchema, yearSchema } from '../../../shared/validation/commonSchemas';

export const youthEnrollmentParamsSchema = z.object({
  id: uuidSchema,
  formationId: uuidSchema,
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
