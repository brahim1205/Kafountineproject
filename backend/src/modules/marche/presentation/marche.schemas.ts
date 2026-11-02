import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { nonNegativeNumberSchema, optionalDateStringSchema, positiveNumberSchema, uuidSchema, yearSchema } from '../../../shared/validation/commonSchemas';

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
  // null libère la place ; une chaîne vide laisse l'occupant inchangé.
  occupantId: uuidSchema.nullable().optional().or(z.literal('')).transform((value) => (value === '' ? undefined : value)),
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
