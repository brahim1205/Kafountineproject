import { z } from 'zod';
import { trimmedString } from '../../../shared/validation/sanitizers';

export const publicIdParamsSchema = z.object({
  publicId: trimmedString(1, 120, 'Identifiant image invalide'),
}).strict();
