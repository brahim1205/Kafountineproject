import { z } from 'zod';
import { optionalTrimmedString } from '../../../shared/validation/sanitizers';
import { paginationSchema, yearSchema } from '../../../shared/validation/commonSchemas';

export const auditListQuerySchema = z.object({
  ...paginationSchema,
  year: yearSchema.optional(),
  search: optionalTrimmedString(160),
  module: optionalTrimmedString(120),
  statut: optionalTrimmedString(40),
}).strict();

export const auditExportSchema = z.object({
  year: yearSchema.optional(),
}).strict();
