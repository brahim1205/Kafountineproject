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

  router.get('/formations', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listFormations(req, res)));
  router.post('/formations', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createFormationSchema), asyncHandler((req, res) => controller.createFormation(req, res)));
  router.put('/formations/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateFormationSchema), asyncHandler((req, res) => controller.updateFormation(req, res)));
  router.delete('/formations/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteFormation(req, res)));
  router.get('/formations/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.getFormationStats(req, res)));

  router.get('/jeunes', authenticate, validate(yearSearchLimitQuerySchema, 'query'), asyncHandler((req, res) => controller.listJeunes(req, res)));
  router.post('/jeunes', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createYouthSchema), asyncHandler((req, res) => controller.createJeune(req, res)));
  router.delete('/jeunes/:id', authenticate, adminOnly, validate(resourceIdParamsSchema, 'params'), asyncHandler((req, res) => controller.deleteJeune(req, res)));
  router.post('/jeunes/:id/formations/:formationId', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(youthEnrollmentParamsSchema, 'params'), asyncHandler((req, res) => controller.inscrireJeuneFormation(req, res)));

  router.get('/etat-civil', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.listEtatCivil(req, res)));
  router.get('/etat-civil/statistiques', authenticate, validate(yearQuerySchema, 'query'), asyncHandler((req, res) => controller.etatCivilStats(req, res)));
  router.post('/etat-civil', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(createEtatCivilSchema), asyncHandler((req, res) => controller.createEtatCivil(req, res)));
  router.put('/etat-civil/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'AGENT'), validate(resourceIdParamsSchema, 'params'), validate(updateEtatCivilSchema), asyncHandler((req, res) => controller.updateEtatCivil(req, res)));

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

  router.get('/settings/permissions', authenticate, adminOnly, asyncHandler((req, res) => controller.getPermissions(req, res)));
  router.post('/settings/permissions', authenticate, adminOnly, validate(updatePermissionSchema), asyncHandler((req, res) => controller.updatePermission(req, res)));
  router.post('/settings/seed', authenticate, adminOnly, asyncHandler((req, res) => controller.settingsSeed(req, res)));

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
