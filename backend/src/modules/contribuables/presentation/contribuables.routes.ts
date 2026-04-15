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

/**
 * @swagger
 * /contribuables:
 *   get:
 *     tags: [Contribuables]
 *     summary: Liste des contribuables
 *     description: Retourne une liste paginée de tous les contribuables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom, prénom ou NIN
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Année fiscale
 *     responses:
 *       200:
 *         description: Liste des contribuables
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 *   post:
 *     tags: [Contribuables]
 *     summary: Créer un contribuable
 *     description: Crée un nouveau contribuable dans le système
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contribuable'
 *     responses:
 *       201:
 *         description: Contribuable créé
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /contribuables/{id}:
 *   put:
 *     tags: [Contribuables]
 *     summary: Modifier un contribuable
 *     description: Met à jour les informations d'un contribuable existant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               telephone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contribuable mis à jour
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     tags: [Contribuables]
 *     summary: Supprimer un contribuable
 *     description: Supprime un contribuable du système
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
 *         description: Contribuable supprimé
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /contribuables/check-telephone:
 *   get:
 *     tags: [Contribuables]
 *     summary: Vérifier un numéro de téléphone
 *     description: Vérifie si un numéro de téléphone existe déjà
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: telephone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Résultat de la vérification
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */

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
