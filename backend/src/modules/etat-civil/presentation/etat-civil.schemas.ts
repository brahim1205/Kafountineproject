import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { nonNegativeNumberSchema, uuidSchema, yearSchema } from '../../../shared/validation/commonSchemas';

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
  // Le formulaire de modification permet de changer de contribuable ; le service le gère.
  contribuableId: uuidSchema.optional(),
  typeDocument: optionalTrimmedString(120),
  exemplaires: z.coerce.number().int().min(1, 'Nombre d’exemplaires invalide').optional(),
  montant: nonNegativeNumberSchema.optional(),
  statut: z.enum(['DELIVREE', 'REJETEE', 'EN_ATTENTE', 'VALIDE', 'REJETE']).optional(),
  observations: optionalTrimmedString(500),
}).strict();
