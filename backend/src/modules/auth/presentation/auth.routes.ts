import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { rateLimit } from '../../../shared/presentation/middleware/rateLimit';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { AuthController } from './AuthController';
import { loginSchema, forgotPasswordSchema, refreshSchema } from './auth.schemas';

export function buildAuthRoutes(controller: AuthController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const loginRateLimit = rateLimit({ keyPrefix: 'auth-login', windowMs: 15 * 60 * 1000, max: 5 });
  const refreshRateLimit = rateLimit({ keyPrefix: 'auth-refresh', windowMs: 5 * 60 * 1000, max: 20 });
  const forgotPasswordRateLimit = rateLimit({ keyPrefix: 'auth-forgot-password', windowMs: 15 * 60 * 1000, max: 5 });

  router.post('/login', loginRateLimit, validate(loginSchema), asyncHandler((req, res) => controller.login(req, res)));
  router.post('/logout', authenticate, asyncHandler((req, res) => controller.logout(req, res)));
  router.get('/me', authenticate, asyncHandler((req, res) => controller.me(req as never, res)));
  router.post('/refresh', refreshRateLimit, validate(refreshSchema), asyncHandler((req, res) => controller.refresh(req, res)));
  router.post('/forgot-password', forgotPasswordRateLimit, validate(forgotPasswordSchema), asyncHandler((req, res) => controller.forgotPassword(req, res)));

  return router;
}
