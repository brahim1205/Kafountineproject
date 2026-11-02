import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { RapportsController } from './RapportsController';
import {
  exportReceiptPdfSchema,
  exportReportPdfSchema,
} from './rapports.schemas';

/**
 * @swagger
 * /exports/receipt.pdf:
 *   post:
 *     tags: [Paramètres]
 *     summary: Exporter reçu PDF
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /exports/report.pdf:
 *   post:
 *     tags: [Paramètres]
 *     summary: Exporter rapport PDF
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 */

export function buildRapportsRoutes(controller: RapportsController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.post('/exports/receipt.pdf', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES', 'QUAI_PECHE'), validate(exportReceiptPdfSchema), asyncHandler((req, res) => controller.exportReceiptPdf(req, res)));
  router.post('/exports/report.pdf', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES'), validate(exportReportPdfSchema), asyncHandler((req, res) => controller.exportReportPdf(req, res)));
  router.get('/exports/report-data', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES'), asyncHandler((req, res) => controller.reportData(req, res)));

  return router;
}
