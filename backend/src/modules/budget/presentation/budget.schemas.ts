import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { nonNegativeNumberSchema, positiveNumberSchema, yearSchema } from '../../../shared/validation/commonSchemas';

export const createBudgetLineSchema = z.object({
  code: trimmedString(1, 40, 'Code requis'),
  libelle: trimmedString(1, 160, 'Libellé requis'),
  // null efface la description (le formulaire envoie null quand le champ est vide).
  description: optionalTrimmedString(255).nullable(),
  prevu: nonNegativeNumberSchema,
  depense: nonNegativeNumberSchema.optional(),
  year: yearSchema.optional(),
}).strict();

export const updateBudgetLineSchema = z.object({
  code: optionalTrimmedString(40),
  libelle: optionalTrimmedString(160),
  // null efface la description (le formulaire envoie null quand le champ est vide).
  description: optionalTrimmedString(255).nullable(),
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
  statut: z.enum(['EN_ATTENTE', 'APPROUVE', 'REJETE']).optional(),
  motif: optionalTrimmedString(255),
}).strict();
