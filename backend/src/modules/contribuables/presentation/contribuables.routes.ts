import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { ContribuablesController } from './ContribuablesController';
import {
  createContribuableSchema,
  updateContribuableSchema,
  listContribuablesQuerySchema,
  checkTelephoneQuerySchema,
} from './contribuables.schemas';

export function buildContribuablesRoutes(controller: ContribuablesController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());

  router.get('/check-telephone', authenticate, validate(checkTelephoneQuerySchema, 'query'), asyncHandler((req, res) => controller.checkTelephone(req, res)));
  router.get('/', authenticate, validate(listContribuablesQuerySchema, 'query'), asyncHandler((req, res) => controller.list(req, res)));
  router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE'), validate(createContribuableSchema), asyncHandler((req, res) => controller.create(req, res)));
  router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE'), validate(updateContribuableSchema), asyncHandler((req, res) => controller.update(req, res)));
  router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler((req, res) => controller.delete(req, res)));

  return router;
}
