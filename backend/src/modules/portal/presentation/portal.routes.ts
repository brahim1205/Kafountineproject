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

export function buildPortalRoutes(controller: PortalController) {
  const router = Router();
  const authenticatePortal = buildAuthenticatePortal(new JwtTokenService());
  const portalLoginRateLimit = rateLimit({ keyPrefix: 'portal-login', windowMs: 15 * 60 * 1000, max: 10 });
  const portalPaymentRateLimit = rateLimit({ keyPrefix: 'portal-payment', windowMs: 5 * 60 * 1000, max: 20 });

  router.post('/auth/contribuable', portalLoginRateLimit, validate(portalLoginSchema), asyncHandler((req, res) => controller.loginContribuable(req, res)));
  router.post('/auth/register', portalLoginRateLimit, validate(portalRegisterSchema), asyncHandler((req, res) => controller.registerContribuable(req, res)));
  router.post('/auth/logout', authenticatePortal, asyncHandler((req, res) => controller.logout(req, res)));
  router.get('/contribuable/:id/taxes', authenticatePortal, asyncHandler((req, res) => controller.listTaxes(req, res)));
  router.get('/contribuable/:id/transactions', authenticatePortal, asyncHandler((req, res) => controller.listTransactions(req, res)));
  router.post('/payment/initiate', authenticatePortal, portalPaymentRateLimit, validate(portalPaymentInitiateSchema), asyncHandler((req, res) => controller.initiatePayment(req as never, res)));
  router.post('/payment/confirm', authenticatePortal, portalPaymentRateLimit, validate(portalPaymentConfirmSchema), asyncHandler((req, res) => controller.confirmPayment(req as never, res)));
  router.get('/recu/:id', authenticatePortal, asyncHandler((req, res) => controller.getReceipt(req as never, res)));

  return router;
}
