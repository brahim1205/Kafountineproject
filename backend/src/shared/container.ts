import { JwtTokenService } from './security/JwtTokenService';
import { HealthCheckService } from './services/HealthCheckService';
import { PrismaUserRepository } from '../modules/auth/infrastructure/PrismaUserRepository';
import { LoginUseCase } from '../modules/auth/application/LoginUseCase';
import { GetCurrentUserUseCase } from '../modules/auth/application/GetCurrentUserUseCase';
import { RequestPasswordResetUseCase } from '../modules/auth/application/RequestPasswordResetUseCase';
import { RefreshTokenUseCase } from '../modules/auth/application/RefreshTokenUseCase';
import { LogoutUseCase } from '../modules/auth/application/LogoutUseCase';
import { ChangePasswordUseCase } from '../modules/auth/application/ChangePasswordUseCase';
import { AuthController } from '../modules/auth/presentation/AuthController';
import { RedisAuthSessionStore } from '../modules/auth/infrastructure/RedisAuthSessionStore';
import { PrismaContribuableRepository } from '../modules/contribuables/infrastructure/PrismaContribuableRepository';
import { CheckTelephoneUseCase } from '../modules/contribuables/application/CheckTelephoneUseCase';
import { ListContribuablesUseCase } from '../modules/contribuables/application/ListContribuablesUseCase';
import { CreateContribuableUseCase } from '../modules/contribuables/application/CreateContribuableUseCase';
import { UpdateContribuableUseCase } from '../modules/contribuables/application/UpdateContribuableUseCase';
import { DeleteContribuableUseCase } from '../modules/contribuables/application/DeleteContribuableUseCase';
import { ContribuablesController } from '../modules/contribuables/presentation/ContribuablesController';
import { PrismaTransactionRepository } from '../modules/transactions/infrastructure/PrismaTransactionRepository';
import { PrismaTaxCatalog } from '../modules/transactions/infrastructure/InMemoryTaxCatalog';
import { ListTransactionCategoriesUseCase } from '../modules/transactions/application/ListTransactionCategoriesUseCase';
import { ListTransactionCategoryServicesUseCase } from '../modules/transactions/application/ListTransactionCategoryServicesUseCase';
import { ListTransactionsUseCase } from '../modules/transactions/application/ListTransactionsUseCase';
import { CreateTransactionUseCase } from '../modules/transactions/application/CreateTransactionUseCase';
import { GetTransactionStatisticsUseCase } from '../modules/transactions/application/GetTransactionStatisticsUseCase';
import { ExportTransactionsUseCase } from '../modules/transactions/application/ExportTransactionsUseCase';
import { ListUsedCategoriesUseCase } from '../modules/transactions/application/ListUsedCategoriesUseCase';
import { UpdateTransactionUseCase } from '../modules/transactions/application/UpdateTransactionUseCase';
import { DeleteTransactionUseCase } from '../modules/transactions/application/DeleteTransactionUseCase';
import { TransactionsController } from '../modules/transactions/presentation/TransactionsController';
import { PrismaDashboardRepository } from '../modules/dashboard/infrastructure/PrismaDashboardRepository';
import { GetDashboardStatisticsUseCase } from '../modules/dashboard/application/GetDashboardStatisticsUseCase';
import { GetTopContribuablesUseCase } from '../modules/dashboard/application/GetTopContribuablesUseCase';
import { DashboardController } from '../modules/dashboard/presentation/DashboardController';
import { PortalOtpService } from '../modules/portal/application/PortalOtpService';
import { RequestPortalOtpUseCase } from '../modules/portal/application/RequestPortalOtpUseCase';
import { VerifyPortalOtpUseCase } from '../modules/portal/application/VerifyPortalOtpUseCase';
import { GetPortalTaxesUseCase } from '../modules/portal/application/GetPortalTaxesUseCase';
import { InitiatePortalPaymentUseCase } from '../modules/portal/application/InitiatePortalPaymentUseCase';
import { ConfirmPortalPaymentUseCase } from '../modules/portal/application/ConfirmPortalPaymentUseCase';
import { PortalController } from '../modules/portal/presentation/PortalController';
import { RegisterPortalContribuableUseCase } from '../modules/portal/application/RegisterPortalContribuableUseCase';
import { GetPortalTransactionsUseCase } from '../modules/portal/application/GetPortalTransactionsUseCase';
import { GetPortalReceiptUseCase } from '../modules/portal/application/GetPortalReceiptUseCase';
import { GetPortalProfileUseCase } from '../modules/portal/application/GetPortalProfileUseCase';
import { RedisPortalPaymentStore } from '../modules/portal/infrastructure/RedisPortalPaymentStore';
import { randomUUID } from 'node:crypto';
import { PrismaAuditTrail } from './infrastructure/audit/PrismaAuditTrail';
import { PrismaUnitOfWork } from './infrastructure/prisma/transactionContext';
import { transactional } from './application/UnitOfWork';
import { PrismaNumeroSequence } from './infrastructure/prisma/PrismaNumeroSequence';
import { PrismaActorDirectory } from './infrastructure/audit/PrismaActorDirectory';
import { PrismaContribuableLookup } from './infrastructure/contribuables/PrismaContribuableLookup';
import { AuditController } from '../modules/audit/presentation/AuditController';
import { AuditService } from '../modules/audit/application/AuditService';
import { PrismaAuditLogRepository } from '../modules/audit/infrastructure/PrismaAuditLogRepository';
import { BudgetController } from '../modules/budget/presentation/BudgetController';
import { BudgetService } from '../modules/budget/application/BudgetService';
import { PrismaBudgetRepository } from '../modules/budget/infrastructure/PrismaBudgetRepository';
import { EtatCivilController } from '../modules/etat-civil/presentation/EtatCivilController';
import { EtatCivilService } from '../modules/etat-civil/application/EtatCivilService';
import { PrismaEtatCivilRepository } from '../modules/etat-civil/infrastructure/PrismaEtatCivilRepository';
import { FormationsController } from '../modules/formations/presentation/FormationsController';
import { FormationService } from '../modules/formations/application/FormationService';
import { PrismaFormationRepository } from '../modules/formations/infrastructure/PrismaFormationRepository';
import { MarcheController } from '../modules/marche/presentation/MarcheController';
import { MarcheService } from '../modules/marche/application/MarcheService';
import { PrismaMarcheRepository } from '../modules/marche/infrastructure/PrismaMarcheRepository';
import { MediasController } from '../modules/medias/presentation/MediasController';
import { ImageService } from '../modules/medias/application/ImageService';
import { LocalImageStorage } from '../modules/medias/infrastructure/LocalImageStorage';
import { MotosController } from '../modules/motos/presentation/MotosController';
import { MotoService } from '../modules/motos/application/MotoService';
import { PrismaMotoRepository } from '../modules/motos/infrastructure/PrismaMotoRepository';
import { NotificationsController } from '../modules/notifications/presentation/NotificationsController';
import { NotificationService } from '../modules/notifications/application/NotificationService';
import { PrismaNotificationRepository } from '../modules/notifications/infrastructure/PrismaNotificationRepository';
import { ParametresController } from '../modules/parametres/presentation/ParametresController';
import { ParametresService } from '../modules/parametres/application/ParametresService';
import { PrismaParametresRepository } from '../modules/parametres/infrastructure/PrismaParametresRepository';
import { PrismaBackupStore } from '../modules/parametres/infrastructure/PrismaBackupStore';
import { QuaiPecheController } from '../modules/quai-peche/presentation/QuaiPecheController';
import { QuaiPecheService } from '../modules/quai-peche/application/QuaiPecheService';
import { PrismaQuaiPecheRepository } from '../modules/quai-peche/infrastructure/PrismaQuaiPecheRepository';
import { RapportsController } from '../modules/rapports/presentation/RapportsController';
import { RapportService } from '../modules/rapports/application/RapportService';
import { PrismaLedgerSource } from '../modules/rapports/infrastructure/PrismaLedgerSource';
import { UrbanismeController } from '../modules/urbanisme/presentation/UrbanismeController';
import { UrbanismeService } from '../modules/urbanisme/application/UrbanismeService';
import { PrismaUrbanismeRepository } from '../modules/urbanisme/infrastructure/PrismaUrbanismeRepository';
import { UtilisateursController } from '../modules/utilisateurs/presentation/UtilisateursController';
import { UtilisateurService } from '../modules/utilisateurs/application/UtilisateurService';
import { BcryptPasswordHasher, PrismaUtilisateurRepository } from '../modules/utilisateurs/infrastructure/PrismaUtilisateurRepository';

export function buildContainer() {
  const tokenService = new JwtTokenService();
  const healthCheckService = new HealthCheckService();

  const userRepository = new PrismaUserRepository();
  const authSessionStore = new RedisAuthSessionStore();
  const contribuableRepository = new PrismaContribuableRepository();
  const transactionRepository = new PrismaTransactionRepository();
  // Chaque encaissement, modification ou suppression est validé avec son entrée d'audit.
  const transactionAudit = new PrismaAuditTrail();
  const transactionUow = new PrismaUnitOfWork();
  const taxCatalog = new PrismaTaxCatalog();
  const dashboardRepository = new PrismaDashboardRepository();
  const portalPaymentStore = new RedisPortalPaymentStore();
  const portalOtpService = new PortalOtpService();

  const authController = new AuthController(
    new LoginUseCase(userRepository, tokenService, authSessionStore),
    new GetCurrentUserUseCase(userRepository),
    new RequestPasswordResetUseCase(userRepository),
    new RefreshTokenUseCase(userRepository, tokenService, authSessionStore),
    new LogoutUseCase(authSessionStore),
    new ChangePasswordUseCase(userRepository, new PrismaAuditTrail())
  );

  const contribuablesController = new ContribuablesController(
    new CheckTelephoneUseCase(contribuableRepository),
    new ListContribuablesUseCase(contribuableRepository),
    new CreateContribuableUseCase(contribuableRepository),
    new UpdateContribuableUseCase(contribuableRepository),
    transactional(new DeleteContribuableUseCase(contribuableRepository, new PrismaAuditTrail()), transactionUow, ['execute'])
  );

  const transactionsController = new TransactionsController(
    new ListTransactionCategoriesUseCase(taxCatalog),
    new ListTransactionCategoryServicesUseCase(taxCatalog),
    new ListTransactionsUseCase(transactionRepository, taxCatalog),
    transactional(new CreateTransactionUseCase(transactionRepository, transactionAudit), transactionUow, ['execute']),
    new GetTransactionStatisticsUseCase(transactionRepository, taxCatalog),
    new ExportTransactionsUseCase(transactionRepository, taxCatalog),
    new ListUsedCategoriesUseCase(transactionRepository, taxCatalog),
    transactional(new UpdateTransactionUseCase(transactionRepository, transactionAudit), transactionUow, ['execute']),
    transactional(new DeleteTransactionUseCase(transactionRepository, transactionAudit), transactionUow, ['execute'])
  );

  const dashboardController = new DashboardController(
    new GetDashboardStatisticsUseCase(dashboardRepository, taxCatalog),
    new GetTopContribuablesUseCase(dashboardRepository)
  );

  const portalController = new PortalController(
    new RequestPortalOtpUseCase(contribuableRepository, portalOtpService),
    new VerifyPortalOtpUseCase(contribuableRepository, tokenService, portalOtpService),
    new RegisterPortalContribuableUseCase(contribuableRepository),
    new GetPortalProfileUseCase(contribuableRepository),
    new GetPortalTaxesUseCase(transactionRepository),
    new GetPortalTransactionsUseCase(transactionRepository),
    new InitiatePortalPaymentUseCase(transactionRepository, portalPaymentStore),
    new ConfirmPortalPaymentUseCase(portalPaymentStore, transactionRepository),
    new GetPortalReceiptUseCase(transactionRepository)
  );

  const municipal = buildMunicipalControllers();

  return {
    tokenService,
    healthCheckService,
    authController,
    contribuablesController,
    transactionsController,
    dashboardController,
    portalController,
    municipal,
  };
}

function buildMunicipalControllers() {
  const auditTrail = new PrismaAuditTrail();
  const actors = new PrismaActorDirectory();
  const contribuables = new PrismaContribuableLookup();
  const numeros = new PrismaNumeroSequence();
  // Chaque écriture et son entrée d'audit sont validées ensemble, ou pas du tout.
  const uow = new PrismaUnitOfWork();

  return {
    formations: new FormationsController(
      transactional(new FormationService(new PrismaFormationRepository(), auditTrail), uow, [
        'createFormation',
        'updateFormation',
        'deleteFormation',
        'createJeune',
        'deleteJeune',
        'inscrireJeune',
      ])
    ),
    etatCivil: new EtatCivilController(
      transactional(new EtatCivilService(new PrismaEtatCivilRepository(), contribuables, auditTrail, numeros), uow, ['create', 'update', 'delete']),
      actors
    ),
    urbanisme: new UrbanismeController(
      transactional(new UrbanismeService(new PrismaUrbanismeRepository(), contribuables, auditTrail, numeros), uow, ['create', 'update', 'delete']),
      actors
    ),
    marche: new MarcheController(
      transactional(new MarcheService(new PrismaMarcheRepository(), contribuables, auditTrail), uow, [
        'createPlace',
        'updatePlace',
        'createPayment',
      ])
    ),
    motos: new MotosController(
      transactional(new MotoService(new PrismaMotoRepository(), contribuables, actors, auditTrail, numeros), uow, ['create', 'update', 'createPayment'])
    ),
    audit: new AuditController(new AuditService(new PrismaAuditLogRepository(), auditTrail)),
    notifications: new NotificationsController(
      transactional(new NotificationService(new PrismaNotificationRepository(), auditTrail), uow, ['openCurrentYear'])
    ),
    utilisateurs: new UtilisateursController(
      transactional(new UtilisateurService(new PrismaUtilisateurRepository(), new BcryptPasswordHasher(), auditTrail), uow, [
        'create',
        'update',
        'delete',
      ])
    ),
    quaiPeche: new QuaiPecheController(
      transactional(new QuaiPecheService(new PrismaQuaiPecheRepository(), auditTrail, numeros), uow, ['create', 'update', 'delete'])
    ),
    // Les sauvegardes restent hors unité de travail : la restauration gère sa propre transaction.
    parametres: new ParametresController(
      transactional(new ParametresService(new PrismaParametresRepository(), new PrismaBackupStore(), auditTrail), uow, [
        'createTariff',
        'updateTariff',
        'deleteTariff',
        'createPenalty',
        'updatePenalty',
        'deletePenalty',
        'updatePermission',
      ])
    ),
    medias: new MediasController(new ImageService(new LocalImageStorage(), randomUUID)),
    rapports: new RapportsController(new RapportService(new PrismaLedgerSource(), auditTrail)),
    budget: new BudgetController(
      transactional(new BudgetService(new PrismaBudgetRepository(), auditTrail), uow, [
        'createLine',
        'updateLine',
        'deleteLine',
        'createRequest',
        'updateRequest',
      ])
    ),
  };
}

export type MunicipalControllers = ReturnType<typeof buildMunicipalControllers>;
