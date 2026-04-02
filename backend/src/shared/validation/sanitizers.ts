import { z } from 'zod';

export const trimmedString = (min = 1, max = 255, message = 'Champ invalide') =>
  z.string().trim().min(min, message).max(max, `${message} (max ${max})`);

export const optionalTrimmedString = (max = 255) =>
  z.union([
    z.string().trim().max(max),
    z.literal('').transform(() => undefined),
  ]).optional();
