import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { rateLimit } from '../../../shared/presentation/middleware/rateLimit';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { AuthController } from './AuthController';
import { loginSchema, forgotPasswordSchema, refreshSchema } from './auth.schemas';
import { env } from '../../../shared/config/env';

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion utilisateur
 *     description: Authentifie un utilisateur et pose des cookies HTTP-only
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email de l'utilisateur
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Déconnexion
 *     description: Déconnecte l'utilisateur et invalide le token
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Profil utilisateur actuel
 *     description: Retourne les informations de l'utilisateur connecté
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rafraîchir le token
 *     description: Utilise le cookie refresh_token pour renouveler les cookies de session
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Demander un reset de mot de passe
 *     description: Envoie un email de reset de mot de passe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email de reset envoyé
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */

export function buildAuthRoutes(controller: AuthController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const loginRateLimit = rateLimit({ keyPrefix: 'auth-login', windowMs: env.loginRateLimitWindowMs, max: env.loginRateLimitMax });
  const refreshRateLimit = rateLimit({ keyPrefix: 'auth-refresh', windowMs: 5 * 60 * 1000, max: 20 });
  const forgotPasswordRateLimit = rateLimit({ keyPrefix: 'auth-forgot-password', windowMs: 15 * 60 * 1000, max: 5 });

  router.post('/login', loginRateLimit, validate(loginSchema), asyncHandler((req, res) => controller.login(req, res)));
  router.post('/logout', authenticate, asyncHandler((req, res) => controller.logout(req, res)));
  router.get('/me', authenticate, asyncHandler((req, res) => controller.me(req as never, res)));
  router.post('/refresh', refreshRateLimit, validate(refreshSchema), asyncHandler((req, res) => controller.refresh(req, res)));
  router.post('/forgot-password', forgotPasswordRateLimit, validate(forgotPasswordSchema), asyncHandler((req, res) => controller.forgotPassword(req, res)));

  return router;
}
