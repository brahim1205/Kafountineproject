import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema, yearQuerySchema } from '../../../shared/validation/commonSchemas';
import type { UrbanismeController } from './UrbanismeController';
import {
  createUrbanismeSchema,
  updateUrbanismeSchema,
  urbanismeListQuerySchema,
} from './urbanisme.schemas';

/**
 * @swagger
 * /urbanisme:
 *   get:
 *     tags: [Urbanisme]
 *     summary: Liste des permis d'urbanisme
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Urbanisme]
 *     summary: Créer un permis
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /urbanisme/{id}:
 *   get:
 *     tags: [Urbanisme]
 *     summary: Détail d'un permis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Urbanisme]
 *     summary: Modifier un permis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Urbanisme]
 *     summary: Supprimer un permis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /urbanisme/statistiques:
 *   get:
 *     tags: [Urbanisme]
 *     summary: Statistiques urbanisme
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 */

export function buildUrbanismeRoutes(controller: UrbanismeController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const adminOnly = authorize('ADMIN', 'SUPER_ADMIN');

  router.get('/urbanisme', authenticate, validate(urbanismeListQuerySchema, 'query'), asyncHandler((req, res) => controller.list(req, res)));
  router.get('/urbanisme/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.stats(req, res)));
  router.get('/urbanisme/:id', authenticate, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.show(req, res)));
  router.post('/urbanisme', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createUrbanismeSchema), asyncHandler((req, res) => controller.create(req, res)));
  router.put('/urbanisme/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateUrbanismeSchema), asyncHandler((req, res) => controller.update(req, res)));
  router.delete('/urbanisme/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.delete(req, res)));

  return router;
}
