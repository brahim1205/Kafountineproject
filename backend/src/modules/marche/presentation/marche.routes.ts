import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema, yearQuerySchema } from '../../../shared/validation/commonSchemas';
import type { MarcheController } from './MarcheController';
import {
  createMarketPaymentSchema,
  createMarketPlaceSchema,
  updateMarketPlaceSchema,
} from './marche.schemas';

/**
 * @swagger
 * /marche/places:
 *   get:
 *     tags: [Marché]
 *     summary: Liste des places du marché
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Marché]
 *     summary: Créer une place
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /marche/places/{id}:
 *   put:
 *     tags: [Marché]
 *     summary: Modifier une place
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /marche/paiements:
 *   get:
 *     tags: [Marché]
 *     summary: Liste des paiements
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Marché]
 *     summary: Enregistrer un paiement
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /marche/statistiques:
 *   get:
 *     tags: [Marché]
 *     summary: Statistiques du marché
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 */

export function buildMarcheRoutes(controller: MarcheController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/marche/places', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listPlaces(req, res)));
  router.post('/marche/places', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'REGISSEUR'), validate(createMarketPlaceSchema), asyncHandler((req, res) => controller.createPlace(req, res)));
  router.put('/marche/places/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), validate(updateMarketPlaceSchema), asyncHandler((req, res) => controller.updatePlace(req, res)));
  router.get('/marche/paiements', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listPayments(req, res)));
  router.post('/marche/paiements', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'SERVICE_FINANCES', 'REGISSEUR'), validate(createMarketPaymentSchema), asyncHandler((req, res) => controller.createPayment(req, res)));
  router.get('/marche/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.stats(req, res)));

  return router;
}
