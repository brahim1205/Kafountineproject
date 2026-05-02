import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { TransactionsController } from './TransactionsController';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionStatisticsQuerySchema,
  categoryServicesParamsSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
} from './transactions.schemas';

/**
 * @swagger
 * /transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: Liste des transactions
 *     description: Retourne une liste paginée des transactions avec filtres optionnels
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 300
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: categorie
 *         schema:
 *           type: string
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [PAYE, EN_ATTENTE, ANNULE]
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags: [Transactions]
 *     summary: Créer une transaction
 *     description: Enregistre une nouvelle transaction de paiement
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contribuableId
 *               - type
 *               - montant
 *             properties:
 *               contribuableId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *               service:
 *                 type: string
 *               quantite:
 *                 type: integer
 *                 default: 1
 *               montant:
 *                 type: number
 *               modePaiement:
 *                 type: string
 *                 enum: [ESPECE, VIREMENT, MOBILE_MONEY, CHEQUE]
 *                 default: ESPECE
 *               statut:
 *                 type: string
 *                 enum: [PAYE, EN_ATTENTE, ANNULE]
 *                 default: PAYE
 *               date:
 *                 type: string
 *               reference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction créée
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /transactions/categories:
 *   get:
 *     tags: [Transactions]
 *     summary: Liste des catégories
 *     description: Retourne toutes les catégories de transactions disponibles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des catégories
 *
 * /transactions/categories/{id}/services:
 *   get:
 *     tags: [Transactions]
 *     summary: Services par catégorie
 *     description: Retourne les services disponibles pour une catégorie
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des services
 *
 * /transactions/statistiques:
 *   get:
 *     tags: [Transactions]
 *     summary: Statistiques des transactions
 *     description: Retourne les statistiques globales des transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statistiques
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /transactions/export:
 *   get:
 *     tags: [Transactions]
 *     summary: Exporter les transactions
 *     description: Exporte les transactions au format CSV/Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fichier exporté
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

export function buildTransactionsRoutes(controller: TransactionsController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/categories', authenticate, asyncHandler((req, res) => controller.categories(req, res)));
  router.get('/categories/:id/services', authenticate, validate(categoryServicesParamsSchema, 'params'), asyncHandler((req, res) => controller.categoryServices(req, res)));
  router.get('/', authenticate, validate(listTransactionsQuerySchema, 'query'), asyncHandler((req, res) => controller.list(req, res)));
  router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES'), validate(createTransactionSchema), asyncHandler((req, res) => controller.create(req as never, res)));
  router.get('/statistiques', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES'), validate(transactionStatisticsQuerySchema, 'query'), asyncHandler((req, res) => controller.statistiques(req, res)));
  router.get('/export', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES'), asyncHandler((req, res) => controller.export(req, res)));
  
  router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(transactionIdParamSchema, 'params'), validate(updateTransactionSchema), asyncHandler((req, res) => controller.update(req, res)));
  router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(transactionIdParamSchema, 'params'), asyncHandler((req, res) => controller.delete(req, res)));

  return router;
}
