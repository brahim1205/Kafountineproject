import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';
import { nonNegativeNumberSchema, positiveNumberSchema, yearSchema } from '../../../shared/validation/commonSchemas';

export const exportReceiptPdfSchema = z.object({
  ticketNumber: trimmedString(1, 120, 'Numéro requis'),
  date: trimmedString(1, 80, 'Date requise'),
  time: trimmedString(1, 20, 'Heure requise'),
  contributor: trimmedString(1, 160, 'Contribuable requis'),
  type: trimmedString(1, 160, 'Type requis'),
  amount: positiveNumberSchema,
  agent: optionalTrimmedString(120),
  telephone: optionalTrimmedString(20),
  nin: optionalTrimmedString(40),
  adresse: optionalTrimmedString(255),
  reference: optionalTrimmedString(120),
  categorie: optionalTrimmedString(160),
  service: optionalTrimmedString(160),
  quantite: optionalTrimmedString(40),
  unite: optionalTrimmedString(80),
  tarifUnitaire: optionalTrimmedString(80),
  modePaiement: optionalTrimmedString(80),
  statut: optionalTrimmedString(80),
  localisation: optionalTrimmedString(255),
  nature: optionalTrimmedString(160),
  description: optionalTrimmedString(500),
}).strict();

export const exportReportPdfSchema = z.object({
  year: yearSchema,
  total: nonNegativeNumberSchema,
  tauxRecouvrement: nonNegativeNumberSchema,
  totalTransactions: z.coerce.number().int().min(0),
  totalContribuables: z.coerce.number().int().min(0),
  modules: z.array(z.object({
    name: trimmedString(1, 120, 'Module invalide'),
    amount: nonNegativeNumberSchema,
    evolution: z.coerce.number().optional(),
  }).strict()).max(50),
  topContribuables: z.array(z.object({
    name: trimmedString(1, 160, 'Contribuable invalide'),
    amount: nonNegativeNumberSchema,
  }).strict()).max(100),
}).strict();
