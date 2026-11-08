import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema, yearLimitQuerySchema, yearQuerySchema } from '../../../shared/validation/commonSchemas';
import type { QuaiPecheController } from './QuaiPecheController';
import {
  createExpeditionSchema,
  createFishCommissionSchema,
  createFishermanSchema,
  createFishingBoatSchema,
  createTruckSchema,
  updateExpeditionSchema,
  updateFishCommissionSchema,
  updateFishermanSchema,
  updateFishingBoatSchema,
  updateTruckSchema,
} from './quai-peche.schemas';

/**
 * @swagger
 * /quai-peche/pecheurs:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des pêcheurs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer un pêcheur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/pecheurs/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail pêcheur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier pêcheur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer pêcheur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/embarcations:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des embarcations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer une embarcation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/embarcations/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail embarcation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier embarcation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer embarcation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/commissions:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des commissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer une commission
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/commissions/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail commission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier commission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer commission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/camions:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des camions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer un camion
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/camions/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail camion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier camion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer camion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/expeditions:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des expéditions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer une expédition
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/expeditions/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail expédition
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier expédition
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer expédition
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/statistiques:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Statistiques quai de pêche
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 */

export function buildQuaiPecheRoutes(controller: QuaiPecheController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/quai-peche/pecheurs', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.list('pecheurs', req, res)));
  router.get('/quai-peche/pecheurs/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.get('pecheurs', req, res)));
  router.post('/quai-peche/pecheurs', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(createFishermanSchema), asyncHandler((req, res) => controller.create('pecheurs', req, res)));
  router.put('/quai-peche/pecheurs/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), validate(updateFishermanSchema), asyncHandler((req, res) => controller.update('pecheurs', req, res)));
  router.delete('/quai-peche/pecheurs/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.delete('pecheurs', req, res)));
  router.get('/quai-peche/embarcations', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.list('embarcations', req, res)));
  router.get('/quai-peche/embarcations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.get('embarcations', req, res)));
  router.post('/quai-peche/embarcations', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(createFishingBoatSchema), asyncHandler((req, res) => controller.create('embarcations', req, res)));
  router.put('/quai-peche/embarcations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), validate(updateFishingBoatSchema), asyncHandler((req, res) => controller.update('embarcations', req, res)));
  router.delete('/quai-peche/embarcations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.delete('embarcations', req, res)));
  router.get('/quai-peche/commissions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.list('commissions', req, res)));
  router.get('/quai-peche/commissions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.get('commissions', req, res)));
  router.post('/quai-peche/commissions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(createFishCommissionSchema), asyncHandler((req, res) => controller.create('commissions', req, res)));
  router.put('/quai-peche/commissions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), validate(updateFishCommissionSchema), asyncHandler((req, res) => controller.update('commissions', req, res)));
  router.delete('/quai-peche/commissions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.delete('commissions', req, res)));
  router.get('/quai-peche/camions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.list('camions', req, res)));
  router.get('/quai-peche/camions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.get('camions', req, res)));
  router.post('/quai-peche/camions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(createTruckSchema), asyncHandler((req, res) => controller.create('camions', req, res)));
  router.put('/quai-peche/camions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), validate(updateTruckSchema), asyncHandler((req, res) => controller.update('camions', req, res)));
  router.delete('/quai-peche/camions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.delete('camions', req, res)));
  router.get('/quai-peche/expeditions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.list('expeditions', req, res)));
  router.get('/quai-peche/expeditions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.get('expeditions', req, res)));
  router.post('/quai-peche/expeditions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(createExpeditionSchema), asyncHandler((req, res) => controller.create('expeditions', req, res)));
  router.put('/quai-peche/expeditions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), validate(updateExpeditionSchema), asyncHandler((req, res) => controller.update('expeditions', req, res)));
  router.delete('/quai-peche/expeditions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'REGISSEUR'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.delete('expeditions', req, res)));
  router.get('/quai-peche/statistiques', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'SERVICE_FINANCES', 'REGISSEUR'), validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.stats(req, res)));

  return router;
}
