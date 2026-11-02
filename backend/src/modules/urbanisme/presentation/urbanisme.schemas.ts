import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { nonNegativeNumberSchema, paginationSchema, uuidSchema, yearSchema } from '../../../shared/validation/commonSchemas';

export const urbanismeListQuerySchema = z.object({
  ...paginationSchema,
  year: yearSchema.optional(),
  statut: optionalTrimmedString(40),
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
