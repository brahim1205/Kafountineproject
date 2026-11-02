import { Router } from 'express';
import type { MunicipalControllers } from '../shared/container';
import { buildAuditRoutes } from './audit/presentation/audit.routes';
import { buildBudgetRoutes } from './budget/presentation/budget.routes';
import { buildEtatCivilRoutes } from './etat-civil/presentation/etat-civil.routes';
import { buildFormationsRoutes } from './formations/presentation/formations.routes';
import { buildMarcheRoutes } from './marche/presentation/marche.routes';
import { buildMediasRoutes } from './medias/presentation/medias.routes';
import { buildMotosRoutes } from './motos/presentation/motos.routes';
import { buildNotificationsRoutes } from './notifications/presentation/notifications.routes';
import { buildParametresRoutes } from './parametres/presentation/parametres.routes';
import { buildQuaiPecheRoutes } from './quai-peche/presentation/quai-peche.routes';
import { buildRapportsRoutes } from './rapports/presentation/rapports.routes';
import { buildUrbanismeRoutes } from './urbanisme/presentation/urbanisme.routes';
import { buildUtilisateursRoutes } from './utilisateurs/presentation/utilisateurs.routes';

/** Routes des services municipaux, montées sous /api/v1. */
export function buildMunicipalRoutes(controllers: MunicipalControllers) {
  const router = Router();
  router.use(buildFormationsRoutes(controllers.formations));
  router.use(buildEtatCivilRoutes(controllers.etatCivil));
  router.use(buildUrbanismeRoutes(controllers.urbanisme));
  router.use(buildMarcheRoutes(controllers.marche));
  router.use(buildMotosRoutes(controllers.motos));
  router.use(buildAuditRoutes(controllers.audit));
  router.use(buildNotificationsRoutes(controllers.notifications));
  router.use(buildUtilisateursRoutes(controllers.utilisateurs));
  router.use(buildQuaiPecheRoutes(controllers.quaiPeche));
  router.use(buildParametresRoutes(controllers.parametres));
  router.use(buildMediasRoutes(controllers.medias));
  router.use(buildRapportsRoutes(controllers.rapports));
  router.use(buildBudgetRoutes(controllers.budget));
  return router;
}
