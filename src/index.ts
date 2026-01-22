// Core modules
export { AdminModule } from './modules/admin/admin.module';
export { MultiTenantModule } from './multi-tenant.module';

// Services
export { MultiTenantConfigService } from './modules/service/multi-tenant-config.service';
export { TenantAdminService } from './modules/service/tenant-admin.service';
export { TenantConnectionService } from './modules/service/tenant-connection.service';
export { TenantContextService } from './modules/service/tenant-context.service';

// Providers
export {
  createSpecificTenantRepositoryProvider,
  createTenantRepositoryFactory,
  createTenantRepositoryProvider,
  createTenantRepositoryProviders,
  TenantDataSourceProvider,
} from './providers/tenant-repository.provider';

// Decorators
export {
  InjectTenantDataSource,
  InjectTenantRepository,
  InjectTenantRepositoryFactory,
} from './decorators/inject-tenant-repository.decorator';

// Middleware
export { TenantFastifyMiddleware } from './middleware/tenant-fastify.middleware';
export { TenantResolverMiddleware } from './middleware/tenant-resolver.middleware';

// Entities
export { Tenant } from './modules/entities/tenant.entity';

// DTOs
export { CreateTenantDto } from './modules/dto/create-tenant.dto';
export { TenantFilterDto } from './modules/dto/filter-tenant.dto';
export { UpdateTenantDto } from './modules/dto/update-tenant.dto';

// Interfaces
export {
  IEntityConfig,
  IMultiTenantConfigService,
  ITenant,
  ITenantConnectionService,
  ITenantContext,
  ITenantContextService,
  MultiTenantModuleAsyncOptions,
  MultiTenantModuleOptions,
  PlatformType,
  TenantResolutionConfig,
} from './interface/tenant.interface';
export {
  ITenantManagementStrategy,
  TENANT_MANAGEMENT_STRATEGY,
} from './interface/tenant-management.interface';
export {
  ITenantMiddlewareExpress,
  ITenantMiddlewareFastify,
  TenantExpressRequest,
  TenantFastifyRequest,
} from './interface/tenant-middleware.interface';
export { TENANT_VALIDATION_STRATEGY } from './interface/tenant-validation.interface';

// Enums
// export { Platform } from "./enums/platform.enum";

export {
  EntityRegistryConfig,
  EntityValidationResult,
} from './interface/entity-registry.interface';
export {
  ConnectionPoolConfig,
  DatabaseConfig,
  IConnectionPoolStats,
} from './interface/typeorm.interface';

// Configuration
export {
  createDatabaseConfigFromEnv,
  getAdminDatabaseConfig,
  getMultiTenantDatabaseConfig,
} from './config/database.config';

// Entity Registry
export { EntityRegistry, EntityRegistryType } from './config/entity.registry';

// Constants
export {
  DEFAULT_TENANT_ENTITY_PRESETS,
  EntityName,
  //   CACHE,
  //   CONNECTION_NAMES,
  //   DEFAULT_CONFIG,
  //   ENTITY_REGISTRY,
  //   ERROR_MESSAGES,
  //   FASTIFY_HEADERS,
  //   LOG_MESSAGES,
  //   MIDDLEWARE,
  //   MULTI_TENANT_CONFIG_TOKEN,
  //   MULTI_TENANT_OPTIONS_TOKEN,
  //   TENANT_CONTEXT,
  //   VALIDATION,
  TenantPreset,
  TenantStatus,
} from './constants';

// Utilities
export { createTenantStrategyProvider } from './utils/create-tenant-strategy.provider';
export {
  configureEntityRegistry,
  getEntityClasses,
  getEntityRegistryConfig,
  getEntityRegistryDebugInfo,
  validateEntityNames,
} from './utils/entity-registry.utils';
export {
  getTenantRepositoryToken,
  TOKEN_CONSTANTS,
} from './utils/generate-token.provider';
