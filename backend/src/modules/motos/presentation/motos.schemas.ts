import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { nonNegativeNumberSchema, optionalDateStringSchema, positiveNumberSchema, uuidSchema, yearSchema } from '../../../shared/validation/commonSchemas';

export const createMotoSchema = z.object({
  matricule: trimmedString(1, 50, 'Matricule requis'),
  marque: trimmedString(1, 80, 'Marque requise'),
  modele: trimmedString(1, 80, 'Modèle requis'),
  annee: z.coerce.number().int().min(1900).max(2100),
  couleur: optionalTrimmedString(40),
  proprietaireId: uuidSchema,
  conducteurId: uuidSchema.optional(),
  permis: optionalTrimmedString(80),
  statut: optionalTrimmedString(40),
  photo: optionalTrimmedString(255),
  enRetard: z.boolean().optional(),
  montantPenalite: nonNegativeNumberSchema.optional(),
  prochainPaiement: optionalDateStringSchema,
  dernierPaiement: optionalDateStringSchema,
  year: yearSchema.optional(),
}).strict();

export const updateMotoSchema = z.object({
  matricule: optionalTrimmedString(50),
  marque: optionalTrimmedString(80),
  modele: optionalTrimmedString(80),
  annee: z.coerce.number().int().min(1900).max(2100).optional(),
  couleur: optionalTrimmedString(40),
  proprietaireId: uuidSchema.optional(),
  conducteurId: uuidSchema.optional(),
  permis: optionalTrimmedString(80),
  statut: optionalTrimmedString(40),
  photo: optionalTrimmedString(255),
  enRetard: z.boolean().optional(),
  montantPenalite: nonNegativeNumberSchema.optional(),
  prochainPaiement: optionalDateStringSchema,
  dernierPaiement: optionalDateStringSchema,
  year: yearSchema.optional(),
}).strict();

export const changeMotoDriverSchema = z.object({
  conducteurId: uuidSchema,
}).strict();

export const createMotoPaymentSchema = z.object({
  motoId: uuidSchema,
  // Sans montant, le serveur facture le tarif mensuel (+ pénalité si la moto est en retard).
  montant: positiveNumberSchema.optional(),
  reference: optionalTrimmedString(120),
  mois: optionalTrimmedString(80),
  year: yearSchema.optional(),
}).strict();
