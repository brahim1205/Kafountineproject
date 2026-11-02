import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from './sanitizers';

export const yearSchema = z.coerce.number().int().min(2000).max(2100);
export const uuidSchema = z.string().uuid('Identifiant invalide');
export const positiveNumberSchema = z.coerce.number().positive('Valeur positive requise');
export const nonNegativeNumberSchema = z.coerce.number().min(0, 'Valeur positive ou nulle requise');
export const dateStringSchema = trimmedString(1, 50, 'Date invalide').refine((value) => !Number.isNaN(Date.parse(value)), 'Date invalide');
export const optionalDateStringSchema = optionalTrimmedString(50).refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), 'Date invalide');
export const paginationSchema = {
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(300).optional().default(20),
};

export const resourceIdParamsSchema = z.object({
  id: uuidSchema,
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
