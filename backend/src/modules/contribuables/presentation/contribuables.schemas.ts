import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';

export const createContribuableSchema = z.object({
  nin: trimmedString(1, 30, 'NIN requis'),
  nom: trimmedString(1, 100, 'Nom requis'),
  prenom: trimmedString(1, 100, 'Prénom requis'),
  dateNaiss: trimmedString(1, 50, 'Date de naissance requise'),
  lieuNaiss: trimmedString(1, 100, 'Lieu de naissance requis'),
  adresse: trimmedString(1, 255, 'Adresse requise'),
  telephone: trimmedString(1, 20, 'Téléphone requis'),
  email: z.union([trimmedString(5, 254, 'Email invalide').email('Email invalide'), z.literal('').transform(() => undefined)]).optional(),
  profession: optionalTrimmedString(100),
  typeContribuable: z.enum(['PARTICULIER', 'ENTREPRISE', 'ASSOCIATION']).optional(),
  zone: optionalTrimmedString(100),
  montantImpot: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
}).strict();

export const updateContribuableSchema = z.object({
  // Le formulaire de modification renvoie le NIN ; le cas d'usage refuse un NIN déjà attribué.
  nin: optionalTrimmedString(30),
  nom: optionalTrimmedString(100),
  prenom: optionalTrimmedString(100),
  dateNaiss: optionalTrimmedString(50),
  lieuNaiss: optionalTrimmedString(100),
  adresse: optionalTrimmedString(255),
  telephone: optionalTrimmedString(20),
  email: z.union([trimmedString(5, 254, 'Email invalide').email('Email invalide'), z.literal('').transform(() => undefined)]).optional(),
  profession: optionalTrimmedString(100),
  typeContribuable: z.enum(['PARTICULIER', 'ENTREPRISE', 'ASSOCIATION']).optional(),
  zone: optionalTrimmedString(100),
  montantImpot: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
}).strict();

export const listContribuablesQuerySchema = z.object({
  search: optionalTrimmedString(100),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
}).strict();

export const checkTelephoneQuerySchema = z.object({
  telephone: trimmedString(1, 20, 'Téléphone requis'),
}).strict();
