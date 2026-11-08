import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';

export const createUserSchema = z.object({
  email: trimmedString(5, 254, 'Email invalide').email('Email invalide').transform((value) => value.toLowerCase()),
  nom: trimmedString(1, 100, 'Nom requis'),
  prenom: trimmedString(1, 100, 'Prénom requis'),
  role: z.enum(['ADMIN', 'SUPER_ADMIN', 'AGENT', 'SERVICE_FINANCES', 'QUAI_PECHE', 'ETAT_CIVIL', 'REGISSEUR']).optional(),
  telephone: optionalTrimmedString(20),
  password: trimmedString(12, 128, 'Mot de passe invalide'),
}).strict();

export const updateUserSchema = z.object({
  email: trimmedString(5, 254, 'Email invalide').email('Email invalide').transform((value) => value.toLowerCase()).optional(),
  nom: optionalTrimmedString(100),
  prenom: optionalTrimmedString(100),
  role: z.enum(['ADMIN', 'SUPER_ADMIN', 'AGENT', 'SERVICE_FINANCES', 'QUAI_PECHE', 'ETAT_CIVIL', 'REGISSEUR']).optional(),
  telephone: optionalTrimmedString(20),
  password: trimmedString(12, 128, 'Mot de passe invalide').optional(),
  isActive: z.boolean().optional(),
}).strict();
