import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema } from '../../../shared/validation/commonSchemas';
import type { UtilisateursController } from './UtilisateursController';
import {
  createUserSchema,
  updateUserSchema,
} from './utilisateurs.schemas';

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Utilisateurs]
 *     summary: Liste des utilisateurs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Utilisateurs]
 *     summary: Créer un utilisateur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /users/{id}:
 *   put:
 *     tags: [Utilisateurs]
 *     summary: Modifier un utilisateur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Utilisateurs]
 *     summary: Supprimer un utilisateur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 */

export function buildUtilisateursRoutes(controller: UtilisateursController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const adminOnly = authorize('ADMIN', 'SUPER_ADMIN', 'REGISSEUR');

  router.get('/users', authenticate, adminOnly, asyncHandler((req, res) => controller.list(req, res)));
  router.post('/users', authenticate, adminOnly, validate(createUserSchema), asyncHandler((req, res) => controller.create(req, res)));
  router.put('/users/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), validate(updateUserSchema), asyncHandler((req, res) => controller.update(req, res)));
  router.delete('/users/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.delete(req, res)));

  return router;
}
