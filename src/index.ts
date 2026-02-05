// Core modules
export { AdminModule } from './admin/admin.module';
export { MultiTenantModule } from './multi-tenant.module';

// Services
export { TenantAdminService } from './admin/services/tenant-admin.service';
export { MultiTenantConfigService } from './core/services/multi-tenant-config.service';
export { TenantConnectionService } from './core/services/tenant-connection.service';
export { TenantContextService } from './core/services/tenant-context.service';

// Providers
export {
  createSpecificTenantRepositoryProvider,
  createTenantRepositoryFactory,
  createTenantRepositoryProvider,
  createTenantRepositoryProviders,
  TenantDataSourceProvider,
} from './core/providers/tenant-repository.provider';

// Decorators
export {
  InjectTenantDataSource,
  InjectTenantRepository,
  InjectTenantRepositoryFactory,
} from './core/decorators/inject-tenant-repository.decorator';

// Middleware
export { TenantFastifyMiddleware } from './core/middleware/tenant-fastify.middleware';
export { TenantResolverMiddleware } from './core/middleware/tenant-resolver.middleware';

// Entities
export { Tenant } from './admin/entities/tenant.entity';

// DTOs
export { CreateTenantDto } from './admin/dto/create-tenant.dto';
export { TenantFilterDto } from './admin/dto/filter-tenant.dto';
export { UpdateTenantDto } from './admin/dto/update-tenant.dto';

// Interfaces
export {
  ITenantManagementStrategy,
  TENANT_MANAGEMENT_STRATEGY,
} from './admin/interfaces/tenant-management.interface';
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
} from './core/interfaces/tenant.interface';
export {
  ITenantMiddlewareExpress,
  ITenantMiddlewareFastify,
  TenantExpressRequest,
  TenantFastifyRequest,
} from './core/interfaces/tenant-middleware.interface';
export { TENANT_VALIDATION_STRATEGY } from './core/interfaces/tenant-validation.interface';

// Enums
// export { Platform } from "./enums/platform.enum";

export {
  EntityRegistryConfig,
  EntityValidationResult,
} from './core/interfaces/entity-registry.interface';
export {
  ConnectionPoolConfig,
  DatabaseConfig,
  IConnectionPoolStats,
} from './core/interfaces/typeorm.interface';

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
export { createTenantStrategyProvider } from './core/utils/create-tenant-strategy.provider';
export {
  configureEntityRegistry,
  getEntityClasses,
  getEntityRegistryConfig,
  getEntityRegistryDebugInfo,
  validateEntityNames,
} from './core/utils/entity-registry.utils';
export {
  getTenantRepositoryToken,
  TOKEN_CONSTANTS,
} from './core/utils/generate-token.provider';
