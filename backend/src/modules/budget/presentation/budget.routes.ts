import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema, yearQuerySchema } from '../../../shared/validation/commonSchemas';
import type { BudgetController } from './BudgetController';
import {
  createBudgetLineSchema,
  createBudgetRequestSchema,
  updateBudgetLineSchema,
  updateBudgetRequestSchema,
} from './budget.schemas';

/**
 * @swagger
 * /budget/lignes:
 *   get:
 *     tags: [Budget]
 *     summary: Liste des lignes budgétaires
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Budget]
 *     summary: Créer une ligne budgétaire
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /budget/lignes/{id}:
 *   put:
 *     tags: [Budget]
 *     summary: Modifier une ligne
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Budget]
 *     summary: Supprimer une ligne
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /budget/stats:
 *   get:
 *     tags: [Budget]
 *     summary: Statistiques budget
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /budget/demandes:
 *   get:
 *     tags: [Budget]
 *     summary: Liste des demandes budget
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Budget]
 *     summary: Créer une demande
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /budget/demandes/{id}:
 *   put:
 *     tags: [Budget]
 *     summary: Modifier une demande
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 */

export function buildBudgetRoutes(controller: BudgetController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const budgetRoles = authorize('ADMIN', 'SUPER_ADMIN', 'SERVICE_FINANCES');

  router.get('/budget/lignes', authenticate, budgetRoles, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listLines(req, res)));
  router.post('/budget/lignes', authenticate, budgetRoles, validate(createBudgetLineSchema), asyncHandler((req, res) => controller.createLine(req, res)));
  router.put('/budget/lignes/:id', authenticate, budgetRoles, validate(resourceIdParamsSchema, 'params'), validate(updateBudgetLineSchema), asyncHandler((req, res) => controller.updateLine(req, res)));
  router.delete('/budget/lignes/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteLine(req, res)));
  router.get('/budget/stats', authenticate, budgetRoles, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.getStats(req, res)));
  router.get('/budget/demandes', authenticate, budgetRoles, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listRequests(req, res)));
  router.post('/budget/demandes', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'SERVICE_FINANCES', 'AGENT'), validate(createBudgetRequestSchema), asyncHandler((req, res) => controller.createRequest(req, res)));
  router.put('/budget/demandes/:id', authenticate, budgetRoles, validate(resourceIdParamsSchema, 'params'), validate(updateBudgetRequestSchema), asyncHandler((req, res) => controller.updateRequest(req, res)));

  return router;
}
