import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema, yearQuerySchema, yearSearchLimitQuerySchema } from '../../../shared/validation/commonSchemas';
import type { MotosController } from './MotosController';
import {
  changeMotoDriverSchema,
  createMotoPaymentSchema,
  createMotoSchema,
  updateMotoSchema,
} from './motos.schemas';

/**
 * @swagger
 * /motos:
 *   get:
 *     tags: [Motos]
 *     summary: Liste des motocyclettes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Motos]
 *     summary: Créer une moto
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /motos/{id}:
 *   put:
 *     tags: [Motos]
 *     summary: Modifier une moto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /motos/{id}/changement-conducteur:
 *   post:
 *     tags: [Motos]
 *     summary: Changer le conducteur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /motos/statistiques:
 *   get:
 *     tags: [Motos]
 *     summary: Statistiques motos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /motos/configuration:
 *   get:
 *     tags: [Motos]
 *     summary: Configuration taxes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /motos/paiements:
 *   get:
 *     tags: [Motos]
 *     summary: Liste des paiements motos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Motos]
 *     summary: Enregistrer un paiement moto
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 */

export function buildMotosRoutes(controller: MotosController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/motos', authenticate, validate(yearSearchLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.list(req, res)));
  router.post('/motos', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createMotoSchema), asyncHandler((req, res) => controller.create(req, res)));
  router.put('/motos/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateMotoSchema), asyncHandler((req, res) => controller.update(req, res)));
  router.post('/motos/:id/changement-conducteur', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(changeMotoDriverSchema), asyncHandler((req, res) => controller.update(req, res)));
  router.get('/motos/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.stats(req, res)));
  router.get('/motos/configuration', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.configuration(req, res)));
  router.get('/motos/paiements', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listPayments(req, res)));
  router.post('/motos/paiements', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES'), validate(createMotoPaymentSchema), asyncHandler((req, res) => controller.createPayment(req, res)));

  return router;
}
