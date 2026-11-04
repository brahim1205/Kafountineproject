import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';

export const loginSchema = z.object({
  email: trimmedString(5, 254, 'Email invalide').email('Email invalide').transform((value) => value.toLowerCase()),
  password: trimmedString(8, 128, 'Mot de passe invalide'),
}).strict();

export const forgotPasswordSchema = z.object({
  email: trimmedString(5, 254, 'Email invalide').email('Email invalide').transform((value) => value.toLowerCase()),
}).strict();

export const refreshSchema = z.object({
  refreshToken: optionalTrimmedString(2048),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: trimmedString(1, 128, 'Mot de passe actuel requis'),
  newPassword: trimmedString(12, 128, 'Le nouveau mot de passe doit contenir au moins 12 caractères'),
}).strict();
