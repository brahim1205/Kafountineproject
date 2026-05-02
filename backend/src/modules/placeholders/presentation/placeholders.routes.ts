import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler';
import { buildAuthenticate } from '../../../shared/presentation/middleware/authenticate';
import { authorize } from '../../../shared/presentation/middleware/authorize';
import { validate } from '../../../shared/presentation/middleware/validation';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { PlaceholderController } from './PlaceholderController';
import {
  auditExportSchema,
  auditListQuerySchema,
  backupFilenameParamsSchema,
  changeMotoDriverSchema,
  createBackupSchema,
  createBudgetLineSchema,
  createBudgetRequestSchema,
  createEtatCivilSchema,
  createExpeditionSchema,
  createFishermanSchema,
  createFishCommissionSchema,
  createFishingBoatSchema,
  createFormationSchema,
  createMarketPaymentSchema,
  createMarketPlaceSchema,
  createMotoPaymentSchema,
  createMotoSchema,
  createPenaltySchema,
  createTarifSchema,
  createTruckSchema,
  createUserSchema,
  createUrbanismeSchema,
  createYouthSchema,
  exportReceiptPdfSchema,
  exportReportPdfSchema,
  markAllReadQuerySchema,
  publicIdParamsSchema,
  resourceIdParamsSchema,
  restoreBackupSchema,
  updateBudgetLineSchema,
  updateBudgetRequestSchema,
  updateEtatCivilSchema,
  updateExpeditionSchema,
  updateFishermanSchema,
  updateFishCommissionSchema,
  updateFishingBoatSchema,
  updateFormationSchema,
  updateMarketPlaceSchema,
  updateMotoSchema,
  updatePenaltySchema,
  updateTarifSchema,
  updateTruckSchema,
  updateUserSchema,
  updateUrbanismeSchema,
  updatePermissionSchema,
  urbanismeListQuerySchema,
  yearLimitQuerySchema,
  yearQuerySchema,
  yearSearchLimitQuerySchema,
  youthEnrollmentParamsSchema,
} from './placeholders.schemas';

/**
 * @swagger
 * /formations:
 *   get:
 *     tags: [Formations]
 *     summary: Liste des formations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/year'
 *       - $ref: '#/components/parameters/limit'
 *     responses:
 *       200:
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Formations]
 *     summary: Créer une formation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /formations/{id}:
 *   put:
 *     tags: [Formations]
 *     summary: Modifier une formation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *       400:
 *       401:
 *       403:
 *   delete:
 *     tags: [Formations]
 *     summary: Supprimer une formation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *       401:
 *       403:
 *
 * /formations/statistiques:
 *   get:
 *     tags: [Formations]
 *     summary: Statistiques des formations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /jeunes:
 *   get:
 *     tags: [Jeunes]
 *     summary: Liste des jeunes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Jeunes]
 *     summary: Créer un jeune
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *   delete:
 *     tags: [Jeunes]
 *     summary: Supprimer un jeune
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /jeunes/{id}/formations/{formationId}:
 *   post:
 *     tags: [Jeunes]
 *     summary: Inscrire un jeune à une formation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /etat-civil:
 *   get:
 *     tags: [État Civil]
 *     summary: Liste des documents d'état civil
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [État Civil]
 *     summary: Créer un document
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /etat-civil/{id}:
 *   put:
 *     tags: [État Civil]
 *     summary: Modifier un document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /etat-civil/statistiques:
 *   get:
 *     tags: [État Civil]
 *     summary: Statistiques état civil
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /urbanisme:
 *   get:
 *     tags: [Urbanisme]
 *     summary: Liste des permis d'urbanisme
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Urbanisme]
 *     summary: Créer un permis
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /urbanisme/{id}:
 *   get:
 *     tags: [Urbanisme]
 *     summary: Détail d'un permis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Urbanisme]
 *     summary: Modifier un permis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Urbanisme]
 *     summary: Supprimer un permis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /urbanisme/statistiques:
 *   get:
 *     tags: [Urbanisme]
 *     summary: Statistiques urbanisme
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /marche/places:
 *   get:
 *     tags: [Marché]
 *     summary: Liste des places du marché
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Marché]
 *     summary: Créer une place
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /marche/places/{id}:
 *   put:
 *     tags: [Marché]
 *     summary: Modifier une place
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /marche/paiements:
 *   get:
 *     tags: [Marché]
 *     summary: Liste des paiements
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Marché]
 *     summary: Enregistrer un paiement
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /marche/statistiques:
 *   get:
 *     tags: [Marché]
 *     summary: Statistiques du marché
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /motos:
 *   get:
 *     tags: [Motos]
 *     summary: Liste des motocyclettes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Motos]
 *     summary: Créer une moto
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /motos/{id}:
 *   put:
 *     tags: [Motos]
 *     summary: Modifier une moto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /motos/{id}/changement-conducteur:
 *   post:
 *     tags: [Motos]
 *     summary: Changer le conducteur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /motos/statistiques:
 *   get:
 *     tags: [Motos]
 *     summary: Statistiques motos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /motos/configuration:
 *   get:
 *     tags: [Motos]
 *     summary: Configuration taxes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /motos/paiements:
 *   get:
 *     tags: [Motos]
 *     summary: Liste des paiements motos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Motos]
 *     summary: Enregistrer un paiement moto
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
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
 *
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Liste des notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marquer comme lu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Tout marquer comme lu
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /users:
 *   get:
 *     tags: [Utilisateurs]
 *     summary: Liste des utilisateurs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Utilisateurs]
 *     summary: Créer un utilisateur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /users/{id}:
 *   put:
 *     tags: [Utilisateurs]
 *     summary: Modifier un utilisateur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Utilisateurs]
 *     summary: Supprimer un utilisateur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/pecheurs:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des pêcheurs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer un pêcheur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/pecheurs/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail pêcheur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier pêcheur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer pêcheur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/embarcations:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des embarcations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer une embarcation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/embarcations/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail embarcation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier embarcation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer embarcation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/commissions:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des commissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer une commission
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/commissions/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail commission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier commission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer commission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/camions:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des camions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer un camion
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/camions/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail camion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier camion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer camion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/expeditions:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Liste des expéditions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Quai Pêche]
 *     summary: Créer une expédition
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /quai-peche/expeditions/{id}:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Détail expédition
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   put:
 *     tags: [Quai Pêche]
 *     summary: Modifier expédition
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Quai Pêche]
 *     summary: Supprimer expédition
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /quai-peche/statistiques:
 *   get:
 *     tags: [Quai Pêche]
 *     summary: Statistiques quai de pêche
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /settings/tarifs:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des tarifs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Paramètres]
 *     summary: Créer un tarif
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /settings/tarifs/{id}:
 *   put:
 *     tags: [Paramètres]
 *     summary: Modifier un tarif
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Paramètres]
 *     summary: Supprimer un tarif
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /settings/penalites:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des pénalités
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Paramètres]
 *     summary: Créer une pénalité
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /settings/penalites/{id}:
 *   put:
 *     tags: [Paramètres]
 *     summary: Modifier une pénalité
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Paramètres]
 *     summary: Supprimer une pénalité
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /settings/permissions:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Paramètres]
 *     summary: Mettre à jour les permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /settings/seed:
 *   post:
 *     tags: [Paramètres]
 *     summary: Seed paramètres
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /settings/backups:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des backups
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Paramètres]
 *     summary: Créer un backup
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /settings/backups/restore:
 *   post:
 *     tags: [Paramètres]
 *     summary: Restaurer un backup
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /settings/backups/{filename}/download:
 *   get:
 *     tags: [Paramètres]
 *     summary: Télécharger un backup
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *
 * /years:
 *   get:
 *     tags: [Paramètres]
 *     summary: Liste des années
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /years/current:
 *   get:
 *     tags: [Paramètres]
 *     summary: Année actuelle
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /years/auto-create:
 *   post:
 *     tags: [Paramètres]
 *     summary: Créer année automatiquement
 *     responses:
 *       200:
 *
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
 *
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
 *
 * /budget/lignes:
 *   get:
 *     tags: [Budget]
 *     summary: Liste des lignes budgétaires
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Budget]
 *     summary: Créer une ligne budgétaire
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /budget/lignes/{id}:
 *   put:
 *     tags: [Budget]
 *     summary: Modifier une ligne
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *   delete:
 *     tags: [Budget]
 *     summary: Supprimer une ligne
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 *
 * /budget/stats:
 *   get:
 *     tags: [Budget]
 *     summary: Statistiques budget
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *
 * /budget/demandes:
 *   get:
 *     tags: [Budget]
 *     summary: Liste des demandes budget
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *   post:
 *     tags: [Budget]
 *     summary: Créer une demande
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *
 * /budget/demandes/{id}:
 *   put:
 *     tags: [Budget]
 *     summary: Modifier une demande
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *     responses:
 *       200:
 */

export function buildPlaceholderRoutes(controller: PlaceholderController) {
  const router = Router();
  const authenticate = buildAuthenticate(new JwtTokenService());
  const adminOnly = authorize('ADMIN', 'SUPER_ADMIN');
  const crudCollections = {
    notifications: 'notifications',
    users: 'users',
    pecheurs: 'pecheurs',
    embarcations: 'embarcations',
    commissions: 'commissions',
    camions: 'camions',
    expeditions: 'expeditions',
    settingsTarifs: 'settingsTarifs',
    settingsPenalites: 'settingsPenalites',
    settingsPermissions: 'settingsPermissions',
    backups: 'backups',
  } as const;

  router.get('/formations', authenticate, validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listFormations(req, res)));
  router.post('/formations', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createFormationSchema), asyncHandler((req, res) => controller.createFormation(req, res)));
  router.put('/formations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateFormationSchema), asyncHandler((req, res) => controller.updateFormation(req, res)));
  router.delete('/formations/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteFormation(req, res)));
  router.get('/formations/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.getFormationStats(req, res)));

  router.get('/jeunes', authenticate, validate(yearSearchLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listJeunes(req, res)));
  router.post('/jeunes', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createYouthSchema), asyncHandler((req, res) => controller.createJeune(req, res)));
  router.delete('/jeunes/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteJeune(req, res)));
  router.post('/jeunes/:id/formations/:formationId', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(youthEnrollmentParamsSchema, 'params'), asyncHandler((req, res) => controller.inscrireJeuneFormation(req, res)));

  router.get('/etat-civil', authenticate, validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listEtatCivil(req, res)));
  router.get('/etat-civil/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.etatCivilStats(req, res)));
  router.post('/etat-civil', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createEtatCivilSchema), asyncHandler((req, res) => controller.createEtatCivil(req, res)));
  router.put('/etat-civil/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateEtatCivilSchema), asyncHandler((req, res) => controller.updateEtatCivil(req, res)));
  router.delete('/etat-civil/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteEtatCivil(req, res)));

  router.get('/urbanisme', authenticate, validate(urbanismeListQuerySchema, 'query'), asyncHandler((req, res) => controller.urbanismeList(req, res)));
  router.get('/urbanisme/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.urbanismeStats(req, res)));
  router.get('/urbanisme/:id', authenticate, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.urbanismeShow(req, res)));
  router.post('/urbanisme', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createUrbanismeSchema), asyncHandler((req, res) => controller.createUrbanisme(req, res)));
  router.put('/urbanisme/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateUrbanismeSchema), asyncHandler((req, res) => controller.updateUrbanisme(req, res)));
  router.delete('/urbanisme/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteUrbanisme(req, res)));

  router.get('/marche/places', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listPlacesMarche(req, res)));
  router.post('/marche/places', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE'), validate(createMarketPlaceSchema), asyncHandler((req, res) => controller.createPlaceMarche(req, res)));
  router.put('/marche/places/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE'), validate(resourceIdParamsSchema, 'params'), validate(updateMarketPlaceSchema), asyncHandler((req, res) => controller.updatePlaceMarche(req, res)));
  router.get('/marche/paiements', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listPaiementsMarche(req, res)));
  router.post('/marche/paiements', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES'), validate(createMarketPaymentSchema), asyncHandler((req, res) => controller.createPaiementMarche(req, res)));
  router.get('/marche/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.marcheStats(req, res)));

  router.get('/motos', authenticate, validate(yearSearchLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listMotos(req, res)));
  router.post('/motos', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createMotoSchema), asyncHandler((req, res) => controller.createMoto(req, res)));
  router.put('/motos/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateMotoSchema), asyncHandler((req, res) => controller.updateMoto(req, res)));
  router.post('/motos/:id/changement-conducteur', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(changeMotoDriverSchema), asyncHandler((req, res) => controller.changeMotoDriver(req, res)));
  router.get('/motos/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.motosStats(req, res)));
  router.get('/motos/configuration', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.motosConfiguration(req, res)));
  router.get('/motos/paiements', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listMotoPayments(req, res)));
  router.post('/motos/paiements', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES'), validate(createMotoPaymentSchema), asyncHandler((req, res) => controller.createMotoPayment(req, res)));

  router.get('/audit', authenticate, adminOnly, validate(auditListQuerySchema, 'query'), asyncHandler((req, res) => controller.auditList(req, res)));
  router.post('/audit/seed', authenticate, adminOnly, asyncHandler((req, res) => controller.auditSeed(req, res)));
  router.post('/audit/export', authenticate, adminOnly, validate(auditExportSchema), asyncHandler((req, res) => controller.auditExport(req, res)));

  router.get('/notifications', authenticate, asyncHandler((req, res) => controller.listCollection(crudCollections.notifications, req, res)));
  router.patch('/notifications/:id/read', authenticate, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.markRead(req, res)));
  router.patch('/notifications/read-all', authenticate, validate(markAllReadQuerySchema, 'query'), asyncHandler((req, res) => controller.markAllRead(req, res)));

  router.get('/users', authenticate, adminOnly, asyncHandler((req, res) => controller.listUsers(req, res)));
  router.post('/users', authenticate, adminOnly, validate(createUserSchema), asyncHandler((req, res) => controller.createUser(req, res)));
  router.put('/users/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), validate(updateUserSchema), asyncHandler((req, res) => controller.updateUser(req, res)));
  router.delete('/users/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteUser(req, res)));

  router.get('/quai-peche/pecheurs', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listCollection(crudCollections.pecheurs, req, res)));
  router.get('/quai-peche/pecheurs/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.getCollectionItem(crudCollections.pecheurs, req, res)));
  router.post('/quai-peche/pecheurs', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(createFishermanSchema), asyncHandler((req, res) => controller.createQuaiResource('pecheurs', req, res)));
  router.put('/quai-peche/pecheurs/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(resourceIdParamsSchema, 'params'), validate(updateFishermanSchema), asyncHandler((req, res) => controller.updateCollectionItem(crudCollections.pecheurs, req, res)));
  router.delete('/quai-peche/pecheurs/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteCollectionItem(crudCollections.pecheurs, req, res)));

  router.get('/quai-peche/embarcations', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listCollection(crudCollections.embarcations, req, res)));
  router.get('/quai-peche/embarcations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.getCollectionItem(crudCollections.embarcations, req, res)));
  router.post('/quai-peche/embarcations', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(createFishingBoatSchema), asyncHandler((req, res) => controller.createQuaiResource('embarcations', req, res)));
  router.put('/quai-peche/embarcations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(resourceIdParamsSchema, 'params'), validate(updateFishingBoatSchema), asyncHandler((req, res) => controller.updateCollectionItem(crudCollections.embarcations, req, res)));
  router.delete('/quai-peche/embarcations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteCollectionItem(crudCollections.embarcations, req, res)));

  router.get('/quai-peche/commissions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listCollection(crudCollections.commissions, req, res)));
  router.get('/quai-peche/commissions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.getCollectionItem(crudCollections.commissions, req, res)));
  router.post('/quai-peche/commissions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(createFishCommissionSchema), asyncHandler((req, res) => controller.createQuaiResource('commissions', req, res)));
  router.put('/quai-peche/commissions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(resourceIdParamsSchema, 'params'), validate(updateFishCommissionSchema), asyncHandler((req, res) => controller.updateCollectionItem(crudCollections.commissions, req, res)));
  router.delete('/quai-peche/commissions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteCollectionItem(crudCollections.commissions, req, res)));

  router.get('/quai-peche/camions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listCollection(crudCollections.camions, req, res)));
  router.get('/quai-peche/camions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.getCollectionItem(crudCollections.camions, req, res)));
  router.post('/quai-peche/camions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(createTruckSchema), asyncHandler((req, res) => controller.createQuaiResource('camions', req, res)));
  router.put('/quai-peche/camions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(resourceIdParamsSchema, 'params'), validate(updateTruckSchema), asyncHandler((req, res) => controller.updateCollectionItem(crudCollections.camions, req, res)));
  router.delete('/quai-peche/camions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteCollectionItem(crudCollections.camions, req, res)));

  router.get('/quai-peche/expeditions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(yearLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listCollection(crudCollections.expeditions, req, res)));
  router.get('/quai-peche/expeditions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'AGENT'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.getCollectionItem(crudCollections.expeditions, req, res)));
  router.post('/quai-peche/expeditions', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(createExpeditionSchema), asyncHandler((req, res) => controller.createQuaiResource('expeditions', req, res)));
  router.put('/quai-peche/expeditions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE'), validate(resourceIdParamsSchema, 'params'), validate(updateExpeditionSchema), asyncHandler((req, res) => controller.updateCollectionItem(crudCollections.expeditions, req, res)));
  router.delete('/quai-peche/expeditions/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteCollectionItem(crudCollections.expeditions, req, res)));
  router.get('/quai-peche/statistiques', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'QUAI_PECHE', 'SERVICE_FINANCES'), validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.quaiPecheStats(req, res)));

  router.get('/settings/tarifs', authenticate, adminOnly, asyncHandler((req, res) => controller.getTarifs(req, res)));
  router.post('/settings/tarifs', authenticate, adminOnly, validate(createTarifSchema), asyncHandler((req, res) => controller.createTarif(req, res)));
  router.put('/settings/tarifs/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), validate(updateTarifSchema), asyncHandler((req, res) => controller.updateTarif(req, res)));
  router.delete('/settings/tarifs/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteTarif(req, res)));

  router.get('/settings/penalites', authenticate, adminOnly, asyncHandler((req, res) => controller.getPenalites(req, res)));
  router.post('/settings/penalites', authenticate, adminOnly, validate(createPenaltySchema), asyncHandler((req, res) => controller.createPenalite(req, res)));
  router.put('/settings/penalites/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), validate(updatePenaltySchema), asyncHandler((req, res) => controller.updatePenalite(req, res)));
  router.delete('/settings/penalites/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deletePenalite(req, res)));

  // Route publique pour consulter les pénalités (sans authentification)
  router.get('/public/penalites', asyncHandler((req, res) => controller.getPenalites(req, res)));

  router.get('/settings/permissions', authenticate, adminOnly, asyncHandler((req, res) => controller.getPermissions(req, res)));
  router.post('/settings/permissions', authenticate, adminOnly, validate(updatePermissionSchema), asyncHandler((req, res) => controller.updatePermission(req, res)));

  router.get('/settings/backups', authenticate, adminOnly, asyncHandler((req, res) => controller.listBackups(req, res)));
  router.post('/settings/backups', authenticate, adminOnly, validate(createBackupSchema), asyncHandler((req, res) => controller.createBackup(req, res)));
  router.post('/settings/backups/restore', authenticate, adminOnly, validate(restoreBackupSchema), asyncHandler((req, res) => controller.restoreBackup(req, res)));
  router.get('/settings/backups/:filename/download', authenticate, adminOnly, validate(backupFilenameParamsSchema, 'params'), asyncHandler((req, res) => controller.downloadBackup(req, res)));

  router.get('/years', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.years(req, res)));
  router.get('/years/current', authenticate, asyncHandler((req, res) => controller.currentYear(req, res)));
  router.post('/years/auto-create', asyncHandler((req, res) => controller.autoCreateYear(req, res)));

  router.post('/upload/image', authenticate, controller.upload.single('image'), asyncHandler((req, res) => controller.uploadImage(req, res)));
  router.delete('/upload/image/:publicId', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(publicIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteImage(req, res)));
  router.post('/exports/receipt.pdf', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT', 'COMPTABLE', 'SERVICE_FINANCES', 'QUAI_PECHE'), validate(exportReceiptPdfSchema), asyncHandler((req, res) => controller.exportReceiptPdf(req, res)));
  router.post('/exports/report.pdf', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES'), validate(exportReportPdfSchema), asyncHandler((req, res) => controller.exportReportPdf(req, res)));
  router.get('/exports/report-data', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES'), asyncHandler((req, res) => controller.getReportData(req, res)));

  const budgetRoles = authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES');
  router.get('/budget/lignes', authenticate, budgetRoles, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listBudgetLignes(req, res)));
  router.post('/budget/lignes', authenticate, budgetRoles, validate(createBudgetLineSchema), asyncHandler((req, res) => controller.createBudgetLigne(req, res)));
  router.put('/budget/lignes/:id', authenticate, budgetRoles, validate(resourceIdParamsSchema, 'params'), validate(updateBudgetLineSchema), asyncHandler((req, res) => controller.updateBudgetLigne(req, res)));
  router.delete('/budget/lignes/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteBudgetLigne(req, res)));
  router.get('/budget/stats', authenticate, budgetRoles, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.getBudgetStats(req, res)));
  router.get('/budget/demandes', authenticate, budgetRoles, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listBudgetDemandes(req, res)));
  router.post('/budget/demandes', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COMPTABLE', 'SERVICE_FINANCES', 'AGENT'), validate(createBudgetRequestSchema), asyncHandler((req, res) => controller.createBudgetDemande(req, res)));
  router.put('/budget/demandes/:id', authenticate, budgetRoles, validate(resourceIdParamsSchema, 'params'), validate(updateBudgetRequestSchema), asyncHandler((req, res) => controller.updateBudgetDemande(req, res)));

  return router;
}
