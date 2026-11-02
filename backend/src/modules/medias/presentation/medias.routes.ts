import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { MediasController } from './MediasController';
import {
  publicIdParamsSchema,
} from './medias.schemas';

/**
 * @swagger
 * /upload/image:
 *   post:
 *     tags: [Paramètres]
 *     summary: Upload d'image
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /upload/image/{publicId}:
 *   delete:
 *     tags: [Paramètres]
 *     summary: Supprimer une image
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 */

export function buildMediasRoutes(controller: MediasController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.post('/upload/image', authenticate, controller.upload.single('image'), asyncHandler((req, res) => controller.uploadImage(req, res)));
  router.delete('/upload/image/:publicId', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(publicIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteImage(req, res)));

  return router;
}
