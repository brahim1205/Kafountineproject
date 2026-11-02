import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import { resourceIdParamsSchema } from '../../../shared/validation/commonSchemas';
import type { ParametresController } from './ParametresController';
import {
  backupFilenameParamsSchema,
  createBackupSchema,
  createPenaltySchema,
  createTarifSchema,
  restoreBackupSchema,
  updatePenaltySchema,
  updatePermissionSchema,
  updateTarifSchema,
} from './parametres.schemas';

/**
 * @swagger
 * /settings/tarifs:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des tarifs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Paramètres]
 *     summary: Créer un tarif
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /settings/tarifs/{id}:
 *   put:
 *     tags: [Paramètres]
 *     summary: Modifier un tarif
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Paramètres]
 *     summary: Supprimer un tarif
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /settings/penalites:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des pénalités
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Paramètres]
 *     summary: Créer une pénalité
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /settings/penalites/{id}:
 *   put:
 *     tags: [Paramètres]
 *     summary: Modifier une pénalité
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Paramètres]
 *     summary: Supprimer une pénalité
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /settings/permissions:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Paramètres]
 *     summary: Mettre à jour les permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /settings/seed:
 *   post:
 *     tags: [Paramètres]
 *     summary: Seed paramètres
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /settings/backups:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des backups
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Paramètres]
 *     summary: Créer un backup
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /settings/backups/restore:
 *   post:
 *     tags: [Paramètres]
 *     summary: Restaurer un backup
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /settings/backups/{filename}/download:
 *   get:
 *     tags: [Paramètres]
 *     summary: Télécharger un backup
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 */

export function buildParametresRoutes(controller: ParametresController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const adminOnly = authorize('ADMIN', 'SUPER_ADMIN');

  router.get('/settings/tarifs', authenticate, adminOnly, asyncHandler((req, res) => controller.listTariffs(req, res)));
  router.post('/settings/tarifs', authenticate, adminOnly, validate(createTarifSchema), asyncHandler((req, res) => controller.createTariff(req, res)));
  router.put('/settings/tarifs/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), validate(updateTarifSchema), asyncHandler((req, res) => controller.updateTariff(req, res)));
  router.delete('/settings/tarifs/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteTariff(req, res)));
  router.get('/settings/penalites', authenticate, adminOnly, asyncHandler((req, res) => controller.listPenalties(req, res)));
  router.post('/settings/penalites', authenticate, adminOnly, validate(createPenaltySchema), asyncHandler((req, res) => controller.createPenalty(req, res)));
  router.put('/settings/penalites/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), validate(updatePenaltySchema), asyncHandler((req, res) => controller.updatePenalty(req, res)));
  router.delete('/settings/penalites/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deletePenalty(req, res)));
  router.get('/public/penalites', asyncHandler((req, res) => controller.listPenalties(req, res)));
  router.get('/settings/permissions', authenticate, adminOnly, asyncHandler((req, res) => controller.listPermissions(req, res)));
  router.post('/settings/permissions', authenticate, adminOnly, validate(updatePermissionSchema), asyncHandler((req, res) => controller.updatePermission(req, res)));
  router.get('/settings/backups', authenticate, adminOnly, asyncHandler((req, res) => controller.listBackups(req, res)));
  router.post('/settings/backups', authenticate, adminOnly, validate(createBackupSchema), asyncHandler((req, res) => controller.createBackup(req, res)));
  router.post('/settings/backups/restore', authenticate, adminOnly, validate(restoreBackupSchema), asyncHandler((req, res) => controller.restoreBackup(req, res)));
  router.get('/settings/backups/:filename/download', authenticate, adminOnly, validate(backupFilenameParamsSchema, 'params'), asyncHandler((req, res) => controller.downloadBackup(req, res)));

  return router;
}
