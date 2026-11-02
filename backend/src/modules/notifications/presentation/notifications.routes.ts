import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema, yearQuerySchema } from '../../../shared/validation/commonSchemas';
import type { NotificationsController } from './NotificationsController';
import {
  markAllReadQuerySchema,
} from './notifications.schemas';

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Liste des notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marquer comme lu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Tout marquer comme lu
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /years:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des années
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /years/current:
 *   get:
 *     tags: [Paramètres]
 *     summary: Année actuelle
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /years/auto-create:
 *   post:
 *     tags: [Paramètres]
 *     summary: Créer année automatiquement
 *     responses:
 *       200:
 */

export function buildNotificationsRoutes(controller: NotificationsController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const adminOnly = authorize('ADMIN', 'SUPER_ADMIN');

  router.get('/notifications', authenticate, asyncHandler((req, res) => controller.list(req, res)));
  router.patch('/notifications/:id/read', authenticate, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.markRead(req, res)));
  router.patch('/notifications/read-all', authenticate, validate(markAllReadQuerySchema, 'query'), asyncHandler((req, res) => controller.markAllRead(req, res)));
  router.get('/years', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.years(req, res)));
  router.get('/years/current', authenticate, asyncHandler((req, res) => controller.currentYear(req, res)));
  router.post('/years/auto-create', authenticate, adminOnly, asyncHandler((req, res) => controller.openCurrentYear(req, res)));

  return router;
}
