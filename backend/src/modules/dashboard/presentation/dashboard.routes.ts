import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { DashboardController } from './DashboardController';
import { dashboardStatisticsQuerySchema } from '../../portal/presentation/portal.schemas';

/**
 * @swagger
 * /dashboard/statistiques:
 *   get:
 *     tags: [Dashboard]
 *     summary: Statistiques du dashboard
 *     description: Retourne les statistiques globales de la municipalité
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Année pour les statistiques
 *     responses:
 *       200:
 *         description: Statistiques du dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

export function buildDashboardRoutes(controller: DashboardController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/statistiques', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'SERVICE_FINANCES', 'AGENT', 'REGISSEUR'), validate(dashboardStatisticsQuerySchema, 'query'), asyncHandler((req, res) => controller.statistiques(req, res)));
  router.get('/top-contribuables', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'SERVICE_FINANCES', 'AGENT', 'REGISSEUR'), validate(dashboardStatisticsQuerySchema, 'query'), asyncHandler((req, res) => controller.topContribuables(req, res)));

  return router;
}
