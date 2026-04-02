import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { DashboardController } from './DashboardController';
import { dashboardStatisticsQuerySchema } from '../../portal/presentation/portal.schemas';

export function buildDashboardRoutes(controller: DashboardController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/statistiques', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES', 'AGENT'), validate(dashboardStatisticsQuerySchema, 'query'), asyncHandler((req, res) => controller.statistiques(req, res)));

  return router;
}
