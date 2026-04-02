import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { TransactionsController } from './TransactionsController';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionStatisticsQuerySchema,
  categoryServicesParamsSchema,
} from './transactions.schemas';

export function buildTransactionsRoutes(controller: TransactionsController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/categories', authenticate, asyncHandler((req, res) => controller.categories(req, res)));
  router.get('/categories/:id/services', authenticate, validate(categoryServicesParamsSchema, 'params'), asyncHandler((req, res) => controller.categoryServices(req, res)));
  router.get('/', authenticate, validate(listTransactionsQuerySchema, 'query'), asyncHandler((req, res) => controller.list(req, res)));
  router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES'), validate(createTransactionSchema), asyncHandler((req, res) => controller.create(req as never, res)));
  router.get('/statistiques', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES'), validate(transactionStatisticsQuerySchema, 'query'), asyncHandler((req, res) => controller.statistiques(req, res)));
  router.get('/export', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES'), asyncHandler((req, res) => controller.export(req, res)));

  return router;
}
