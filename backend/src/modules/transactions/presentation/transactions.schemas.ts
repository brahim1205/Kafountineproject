import { z } from 'zod';
import { optionalTrimmedString, trimmedString } from '../../../shared/validation/sanitizers';

export const createTransactionSchema = z.object({
  contribuableId: z.string().uuid('ID contribuable invalide'),
  type: trimmedString(1, 100, 'Type de transaction requis'),
  service: optionalTrimmedString(120),
  quantite: z.coerce.number().int().min(1).optional().default(1),
  montant: z.coerce.number().min(0, 'Le montant doit être positif'),
  modePaiement: z.enum(['ESPECE', 'VIREMENT', 'MOBILE_MONEY', 'CHEQUE']).optional().default('ESPECE'),
  statut: z.enum(['PAYE', 'EN_ATTENTE', 'ANNULE']).optional().default('PAYE'),
  date: optionalTrimmedString(50),
  reference: optionalTrimmedString(120),
}).strict();

export const updateTransactionSchema = z.object({
  contribuableId: z.string().uuid('ID contribuable invalide').optional(),
  type: optionalTrimmedString(100),
  service: optionalTrimmedString(120),
  quantite: z.coerce.number().int().min(1).optional(),
  montant: z.coerce.number().min(0, 'Le montant doit être positif').optional(),
  modePaiement: z.enum(['ESPECE', 'VIREMENT', 'MOBILE_MONEY', 'CHEQUE']).optional(),
  statut: z.enum(['PAYE', 'EN_ATTENTE', 'ANNULE']).optional(),
}).strict();

export const transactionIdParamSchema = z.object({
  id: z.string().uuid('ID invalide'),
}).strict();

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(300).optional().default(20),
  search: optionalTrimmedString(100),
  startDate: optionalTrimmedString(50),
  endDate: optionalTrimmedString(50),
  categorie: optionalTrimmedString(100),
  statut: optionalTrimmedString(20),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
}).strict();

export const transactionStatisticsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
}).strict();

export const categoryServicesParamsSchema = z.object({
  id: trimmedString(1, 100, 'ID catégorie requis'),
}).strict();
