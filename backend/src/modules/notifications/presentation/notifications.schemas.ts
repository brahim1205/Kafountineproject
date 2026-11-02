import { z } from 'zod';
import { yearSchema } from '../../../shared/validation/commonSchemas';

export const markAllReadQuerySchema = z.object({
  year: yearSchema.optional(),
}).strict();
