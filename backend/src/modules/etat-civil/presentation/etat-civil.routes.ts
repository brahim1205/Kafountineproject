import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema, yearLimitQuerySchema, yearQuerySchema } from '../../../shared/validation/commonSchemas';
import type { EtatCivilController } from './EtatCivilController';
import {
  createEtatCivilSchema,
  updateEtatCivilSchema,
} from './etat-civil.schemas';

/**
 * @swagger
 * /etat-civil:
 *   get:
 *     tags: [État Civil]
 *     summary: Liste des documents d'état civil
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [État Civil]
 *     summary: Créer un document
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /etat-civil/{id}:
 *   put:
 *     tags: [État Civil]
 *     summary: Modifier un document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /etat-civil/statistiques:
 *   get:
 *     tags: [État Civil]
 *     summary: Statistiques état civil
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 */

export function buildEtatCivilRoutes(controller: EtatCivilController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/etat-civil', authenticate, validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.list(req, res)));
  router.get('/etat-civil/types-documents', authenticate, asyncHandler((req, res) => controller.documentTypes(req, res)));
  router.get('/etat-civil/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.stats(req, res)));
  router.post('/etat-civil', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createEtatCivilSchema), asyncHandler((req, res) => controller.create(req, res)));
  router.put('/etat-civil/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateEtatCivilSchema), asyncHandler((req, res) => controller.update(req, res)));
  router.delete('/etat-civil/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.delete(req, res)));

  return router;
}
