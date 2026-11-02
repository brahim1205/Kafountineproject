import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';

export const dashboardStatisticsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

export const portalLoginSchema = z
  .object({
    nin: trimmedString(3, 30, 'NIN requis'),
    telephone: trimmedString(3, 20, 'Téléphone requis'),
  })
  .strict();

export const portalOtpVerifySchema = z.object({
  requestId: z.string().uuid('Demande OTP invalide'),
  code: z.string().trim().regex(/^\d{6}$/, 'Code OTP invalide'),
}).strict();

export const portalRegisterSchema = z.object({
  nin: trimmedString(3, 30, 'NIN requis'),
  nom: trimmedString(1, 100, 'Nom requis'),
  prenom: trimmedString(1, 100, 'Prénom requis'),
  telephone: optionalTrimmedString(20),
  adresse: optionalTrimmedString(255),
  lieuNaiss: optionalTrimmedString(100),
  dateNaiss: optionalTrimmedString(50),
}).strict();

export const portalPaymentInitiateSchema = z.object({
  amount: z.coerce.number().min(0, 'Montant invalide').optional(),
  montant: z.coerce.number().min(0, 'Montant invalide').optional(),
  phone: optionalTrimmedString(20),
  telephone: optionalTrimmedString(20),
  method: optionalTrimmedString(20),
  taxes: z.array(trimmedString(1, 128, 'Taxe invalide')).max(50).optional(),
  contribuableId: z.string().uuid('ID contribuable invalide').optional(),
  categorie: optionalTrimmedString(100),
}).strict().refine((value) => value.amount !== undefined || value.montant !== undefined, {
  message: 'Montant requis',
});

export const portalPaymentConfirmSchema = z.object({
  transactionId: trimmedString(1, 128, 'ID transaction invalide'),
  reference: optionalTrimmedString(128),
}).strict();
