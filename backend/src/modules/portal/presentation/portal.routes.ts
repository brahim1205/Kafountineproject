import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticatePortal } from '../../../shared/presentation/middleware/authenticatePortal';
import { rateLimit } from '../../../shared/presentation/middleware/rateLimit';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { PortalController } from './PortalController';
import {
  portalLoginSchema,
  portalPaymentInitiateSchema,
  portalPaymentConfirmSchema,
  portalRegisterSchema,
} from './portal.schemas';

/**
 * @swagger
 * /portal/auth/contribuable:
 *   post:
 *     tags: [Portail]
 *     summary: Connexion contribuable
 *     description: Authentifie un contribuable sur le portail public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nin:
 *                 type: string
 *                 description: Numéro d'identification national
 *               telephone:
 *                 type: string
 *                 description: Numéro de téléphone
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *
 * /portal/auth/register:
 *   post:
 *     tags: [Portail]
 *     summary: Inscription contribuable
 *     description: Inscrit un nouveau contribuable sur le portail
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nin
 *               - nom
 *               - prenom
 *             properties:
 *               nin:
 *                 type: string
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               telephone:
 *                 type: string
 *               adresse:
 *                 type: string
 *               lieuNaiss:
 *                 type: string
 *               dateNaiss:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inscription réussie
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *
 * /portal/auth/me:
 *   get:
 *     tags: [Portail]
 *     summary: Profil connected
 *     description: Retourne le profil du contribuable connecté
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil du contribuable
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /portal/auth/logout:
 *   post:
 *     tags: [Portail]
 *     summary: Déconnexion portail
 *     description: Déconnecte le contribuable du portail
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *
 * /portal/contribuable/{id}/taxes:
 *   get:
 *     tags: [Portail]
 *     summary: Taxes du contribuable
 *     description: Liste les taxes dues par le contribuable
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des taxes
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /portal/contribuable/{id}/transactions:
 *   get:
 *     tags: [Portail]
 *     summary: Transactions du contribuable
 *     description: Liste les transactions du contribuable
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des transactions
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /portal/payment/initiate:
 *   post:
 *     tags: [Portail]
 *     summary: Initier un paiement
 *     description: Initie un paiement de taxe
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               montant:
 *                 type: number
 *               phone:
 *                 type: string
 *               telephone:
 *                 type: string
 *               method:
 *                 type: string
 *               taxes:
 *                 type: array
 *                 items:
 *                   type: string
 *               contribuableId:
 *                 type: string
 *                 format: uuid
 *               categorie:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paiement initiated
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /portal/payment/confirm:
 *   post:
 *     tags: [Portail]
 *     summary: Confirmer un paiement
 *     description: Confirme un paiement en attente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: string
 *               reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paiement confirmé
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /portal/recu/{id}:
 *   get:
 *     tags: [Portail]
 *     summary: Récupérer un reçu
 *     description: Télécharge le reçu PDF d'une transaction
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
 *         description: Reçu PDF
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

export function buildPortalRoutes(controller: PortalController) {
  const router = Router();
  const authenticatePortal = buildAuthenticatePortal(new JwtTokenService());
  const portalLoginRateLimit = rateLimit({ keyPrefix: 'portal-login', windowMs: 15 * 60 * 1000, max: 10 });
  const portalPaymentRateLimit = rateLimit({ keyPrefix: 'portal-payment', windowMs: 5 * 60 * 1000, max: 20 });

  router.post('/auth/contribuable', portalLoginRateLimit, validate(portalLoginSchema), asyncHandler((req, res) => controller.loginContribuable(req, res)));
  router.post('/auth/register', portalLoginRateLimit, validate(portalRegisterSchema), asyncHandler((req, res) => controller.registerContribuable(req, res)));
  router.get('/auth/me', authenticatePortal, asyncHandler((req, res) => controller.me(req as never, res)));
  router.post('/auth/logout', authenticatePortal, asyncHandler((req, res) => controller.logout(req, res)));
  router.get('/contribuable/:id/taxes', authenticatePortal, asyncHandler((req, res) => controller.listTaxes(req, res)));
  router.get('/contribuable/:id/transactions', authenticatePortal, asyncHandler((req, res) => controller.listTransactions(req, res)));
  router.post('/payment/initiate', authenticatePortal, portalPaymentRateLimit, validate(portalPaymentInitiateSchema), asyncHandler((req, res) => controller.initiatePayment(req as never, res)));
  router.post('/payment/confirm', authenticatePortal, portalPaymentRateLimit, validate(portalPaymentConfirmSchema), asyncHandler((req, res) => controller.confirmPayment(req as never, res)));
  router.get('/recu/:id', authenticatePortal, asyncHandler((req, res) => controller.getReceipt(req as never, res)));

  return router;
}
