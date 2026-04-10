import { JwtTokenService } from './security/JwtTokenService';
import { HealthCheckService } from './services/HealthCheckService';
import { PrismaUserRepository } from '../modules/auth/infrastructure/PrismaUserRepository';
import { LoginUseCase } from '../modules/auth/application/LoginUseCase';
import { GetCurrentUserUseCase } from '../modules/auth/application/GetCurrentUserUseCase';
import { RequestPasswordResetUseCase } from '../modules/auth/application/RequestPasswordResetUseCase';
import { RefreshTokenUseCase } from '../modules/auth/application/RefreshTokenUseCase';
import { LogoutUseCase } from '../modules/auth/application/LogoutUseCase';
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
import { InMemoryTaxCatalog } from '../modules/transactions/infrastructure/InMemoryTaxCatalog';
import { ListTransactionCategoriesUseCase } from '../modules/transactions/application/ListTransactionCategoriesUseCase';
import { ListTransactionCategoryServicesUseCase } from '../modules/transactions/application/ListTransactionCategoryServicesUseCase';
import { ListTransactionsUseCase } from '../modules/transactions/application/ListTransactionsUseCase';
import { CreateTransactionUseCase } from '../modules/transactions/application/CreateTransactionUseCase';
import { GetTransactionStatisticsUseCase } from '../modules/transactions/application/GetTransactionStatisticsUseCase';
import { ExportTransactionsUseCase } from '../modules/transactions/application/ExportTransactionsUseCase';
import { TransactionsController } from '../modules/transactions/presentation/TransactionsController';
import { PrismaDashboardRepository } from '../modules/dashboard/infrastructure/PrismaDashboardRepository';
import { GetDashboardStatisticsUseCase } from '../modules/dashboard/application/GetDashboardStatisticsUseCase';
import { DashboardController } from '../modules/dashboard/presentation/DashboardController';
import { PortalLoginContribuableUseCase } from '../modules/portal/application/PortalLoginContribuableUseCase';
import { GetPortalTaxesUseCase } from '../modules/portal/application/GetPortalTaxesUseCase';
import { InitiatePortalPaymentUseCase } from '../modules/portal/application/InitiatePortalPaymentUseCase';
import { ConfirmPortalPaymentUseCase } from '../modules/portal/application/ConfirmPortalPaymentUseCase';
import { PortalController } from '../modules/portal/presentation/PortalController';
import { RegisterPortalContribuableUseCase } from '../modules/portal/application/RegisterPortalContribuableUseCase';
import { GetPortalTransactionsUseCase } from '../modules/portal/application/GetPortalTransactionsUseCase';
import { GetPortalReceiptUseCase } from '../modules/portal/application/GetPortalReceiptUseCase';
import { GetPortalProfileUseCase } from '../modules/portal/application/GetPortalProfileUseCase';
import { RedisPortalPaymentStore } from '../modules/portal/infrastructure/RedisPortalPaymentStore';
import { PlaceholderController } from '../modules/placeholders/presentation/PlaceholderController';

export function buildContainer() {
  const tokenService = new JwtTokenService();
  const healthCheckService = new HealthCheckService();

  const userRepository = new PrismaUserRepository();
  const authSessionStore = new RedisAuthSessionStore();
  const contribuableRepository = new PrismaContribuableRepository();
  const transactionRepository = new PrismaTransactionRepository();
  const taxCatalog = new InMemoryTaxCatalog();
  const dashboardRepository = new PrismaDashboardRepository();
  const portalPaymentStore = new RedisPortalPaymentStore();

  const authController = new AuthController(
    new LoginUseCase(userRepository, tokenService, authSessionStore),
    new GetCurrentUserUseCase(userRepository),
    new RequestPasswordResetUseCase(userRepository),
    new RefreshTokenUseCase(userRepository, tokenService, authSessionStore),
    new LogoutUseCase(authSessionStore)
  );

  const contribuablesController = new ContribuablesController(
    new CheckTelephoneUseCase(contribuableRepository),
    new ListContribuablesUseCase(contribuableRepository),
    new CreateContribuableUseCase(contribuableRepository),
    new UpdateContribuableUseCase(contribuableRepository),
    new DeleteContribuableUseCase(contribuableRepository)
  );

  const transactionsController = new TransactionsController(
    new ListTransactionCategoriesUseCase(taxCatalog),
    new ListTransactionCategoryServicesUseCase(taxCatalog),
    new ListTransactionsUseCase(transactionRepository),
    new CreateTransactionUseCase(transactionRepository),
    new GetTransactionStatisticsUseCase(transactionRepository),
    new ExportTransactionsUseCase()
  );

  const dashboardController = new DashboardController(
    new GetDashboardStatisticsUseCase(dashboardRepository)
  );

  const portalController = new PortalController(
    new PortalLoginContribuableUseCase(contribuableRepository, tokenService),
    new RegisterPortalContribuableUseCase(contribuableRepository, tokenService),
    new GetPortalProfileUseCase(contribuableRepository),
    new GetPortalTaxesUseCase(transactionRepository),
    new GetPortalTransactionsUseCase(transactionRepository),
    new InitiatePortalPaymentUseCase(transactionRepository, portalPaymentStore),
    new ConfirmPortalPaymentUseCase(portalPaymentStore, transactionRepository),
    new GetPortalReceiptUseCase(transactionRepository)
  );

  const placeholderController = new PlaceholderController();

  return {
    tokenService,
    healthCheckService,
    authController,
    contribuablesController,
    transactionsController,
    dashboardController,
    portalController,
    placeholderController,
  };
}
