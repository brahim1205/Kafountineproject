import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema, yearLimitQuerySchema, yearQuerySchema, yearSearchLimitQuerySchema } from '../../../shared/validation/commonSchemas';
import type { FormationsController } from './FormationsController';
import {
  createFormationSchema,
  createYouthSchema,
  updateFormationSchema,
  youthEnrollmentParamsSchema,
} from './formations.schemas';

/**
 * @swagger
 * /formations:
 *   get:
 *     tags: [Formations]
 *     summary: Liste des formations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/year'
 *       - $ref: '#/components/parameters/limit'
 *     responses:
 *       200:
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Formations]
 *     summary: Créer une formation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /formations/{id}:
 *   put:
 *     tags: [Formations]
 *     summary: Modifier une formation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *       400:
 *       401:
 *       403:
 *   delete:
 *     tags: [Formations]
 *     summary: Supprimer une formation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *       401:
 *       403:
 *
 * /formations/statistiques:
 *   get:
 *     tags: [Formations]
 *     summary: Statistiques des formations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /jeunes:
 *   get:
 *     tags: [Jeunes]
 *     summary: Liste des jeunes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Jeunes]
 *     summary: Créer un jeune
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *   delete:
 *     tags: [Jeunes]
 *     summary: Supprimer un jeune
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /jeunes/{id}/formations/{formationId}:
 *   post:
 *     tags: [Jeunes]
 *     summary: Inscrire un jeune à une formation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 */

export function buildFormationsRoutes(controller: FormationsController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const adminOnly = authorize('ADMIN', 'SUPER_ADMIN');

  router.get('/formations', authenticate, validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listFormations(req, res)));
  router.post('/formations', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createFormationSchema), asyncHandler((req, res) => controller.createFormation(req, res)));
  router.put('/formations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateFormationSchema), asyncHandler((req, res) => controller.updateFormation(req, res)));
  router.delete('/formations/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteFormation(req, res)));
  router.get('/formations/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.getStats(req, res)));
  router.get('/jeunes', authenticate, validate(yearSearchLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listJeunes(req, res)));
  router.post('/jeunes', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createYouthSchema), asyncHandler((req, res) => controller.createJeune(req, res)));
  router.delete('/jeunes/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteJeune(req, res)));
  router.post('/jeunes/:id/formations/:formationId', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(youthEnrollmentParamsSchema, 'params'), asyncHandler((req, res) => controller.inscrireJeune(req, res)));

  return router;
}
