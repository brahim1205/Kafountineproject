import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { nonNegativeNumberSchema } from '../../../shared/validation/commonSchemas';

const backupFilenameSchema = z
  .string()
  .regex(/^backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.json$/, 'Nom de fichier de sauvegarde invalide');
export const backupFilenameParamsSchema = z.object({
  filename: backupFilenameSchema,
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
  filename: backupFilenameSchema,
}).strict();
