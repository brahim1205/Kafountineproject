import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { AuditController } from './AuditController';
import {
  auditExportSchema,
  auditListQuerySchema,
} from './audit.schemas';

/**
 * @swagger
 * /audit:
 *   get:
 *     tags: [Audit]
 *     summary: Liste des audits
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Audit]
 *     summary: Seed audit
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /audit/export:
 *   post:
 *     tags: [Audit]
 *     summary: Exporter les audits
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 */

export function buildAuditRoutes(controller: AuditController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const adminOnly = authorize('ADMIN', 'SUPER_ADMIN');

  router.get('/audit', authenticate, adminOnly, validate(auditListQuerySchema, 'query'), asyncHandler((req, res) => controller.list(req, res)));
  router.post('/audit/seed', authenticate, adminOnly, asyncHandler((req, res) => controller.seed(req, res)));
  router.post('/audit/export', authenticate, adminOnly, validate(auditExportSchema), asyncHandler((req, res) => controller.exportCsv(req, res)));

  return router;
}
