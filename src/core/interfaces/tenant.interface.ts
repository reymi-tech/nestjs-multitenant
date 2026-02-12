import { DynamicModule, ModuleMetadata, Provider, Type } from '@nestjs/common';

import { EntityRegistryType } from '../../config/entity.registry';
import { EntityName, TenantPreset, TenantStatus } from '../../constants';
import { OrmConfig, TenantOrmConnection } from './orm-abstraction.interface';
import {
  ConnectionPoolConfig,
  DatabaseConfig,
  IConnectionPoolStats,
} from './typeorm.interface';

export interface IEntityConfig {
  enabledEntities: string[];
  preset?: string;
  customSettings?: Record<string, unknown>;
}

export interface ITenant {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: TenantStatus;
  settings?: Record<string, unknown>;
  entityConfig?: IEntityConfig;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ITenantContextService {
  setContext(tenantId: string): void;
  getTenantSchema(): string | undefined;
  getContext(): ITenantContext;
}

export interface ITenantContext {
  tenantId: string | undefined;
  tenantSchema: string | undefined;
  hasTenant: boolean;
}

export interface TenantResolutionConfig {
  /**
   * Strategy for resolving tenant from request
   * - 'header': Use x-tenant-id header
   * - 'subdomain': Extract from subdomain
   * - 'jwt': Extract from JWT token
   * - 'custom': Use custom resolver function
   */
  strategy: 'header' | 'subdomain' | 'jwt' | 'custom';

  /**
   * Custom resolver function (required when strategy is 'custom')
   */
  customResolver?: (request: unknown) => string | undefined;

  /**
   * Header name for tenant ID (default: 'x-tenant-id')
   */
  headerName?: string;

  /**
   * JWT claim name for tenant ID (default: 'tenant')
   */
  jwtClaimName?: string;

  /**
   * Default tenant ID when none is resolved
   */
  defaultTenant?: string;
}

export type PlatformType = 'express' | 'fastify';

export interface MultiTenantModuleOptions {
  /**
   * ORM configuration
   * Specify which ORM to use and its configuration
   */
  orm?: OrmConfig;
  /**
   * Database configuration for tenant connections
   */
  database: DatabaseConfig;

  /**
   * Web server platform to use ('express' or 'fastify')
   */
  platform?: PlatformType;

  /**
   * Configuration for tenant resolution from requests
   */
  tenantResolution?: TenantResolutionConfig;

  /**
   * Connection pool configuration for tenant connections
   */
  connectionPool?: ConnectionPoolConfig;

  /**
   * Enable the admin module for tenant management
   */
  enableAdminModule?: boolean;

  /**
   * Registry of entities to be used for tenant-specific schemas
   */
  entityRegistry?: EntityRegistryType;

  /**
   * Default presets for entity configuration
   */
  defaultEntityPresets?: Record<TenantPreset, EntityName[]>;

  /**
   * Automatically create schemas for tenants
   */
  autoCreateSchemas?: boolean;

  /**
   * Strategy for naming tenant schemas
   */
  schemaNamingStrategy?: (tenantId: string) => string;

  /**
   * Validation strategy for tenant management
   */
  validationStrategy?: 'local' | 'remote' | 'custom';

  /**
   * Remote service URL for validation strategy (required when validationStrategy is 'remote')
   */
  remoteServiceUrl?: string;

  /**
   * Custom providers for tenant management
   */
  customProviders?: Provider[];

  /**
   * Custom controllers for tenant management
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customControllers?: Type<any>[];

  /**
   * Custom imports for tenant management
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customImports?: Array<Type<any> | DynamicModule | Promise<DynamicModule>>;
}

export interface MultiTenantModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Factory function to create module options
   */
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<MultiTenantModuleOptions> | MultiTenantModuleOptions;
  /**
   * Dependencies to inject into the factory function
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];

  /**
   * Controllers to register
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controllers?: Type<any>[];

  /**
   * Custom validation strategy provider
   */
  validationStrategyProvider?: Provider;

  /**
   * Custom management strategy provider
   */
  managementStrategyProvider?: Provider;

  /**
   * Custom ORM strategy provider
   */
  ormStrategyProvider?: Provider;
}

export interface BuildMultitenantModuleOptions {
  /**
   * Factory function for module options
   */
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<MultiTenantModuleOptions> | MultiTenantModuleOptions;

  /**
   * Dependencies to inject into useFactory
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];

  /**
   * ORM type - determines which imports and controllers to add
   */
  ormType?: 'typeorm' | 'drizzle';

  /**
   * Whether admin module is enabled (defaults to true)
   */
  enableAdminController?: boolean;

  /**
   * Additional imports to include
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalImports?: any[];

  /**
   * Additional controllers to include
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalControllers?: Type<any>[];

  /**
   * Custom management strategy provider
   */
  managementStrategyProvider?: Provider;
}

export interface IMultiTenantConfigService {
  getDatabaseConfig(): DatabaseConfig;
  getTenantResolutionConfig(): TenantResolutionConfig;
  getConnectionPoolConfig(): ConnectionPoolConfig;
  isAdminModuleEnable(): boolean;
  getEntityRegistry(): EntityRegistryType;
  getDefaultEntityPresets(): Record<TenantPreset, EntityName[]>;
  isAutoCreateSchemasEnabled(): boolean;
  getSchemaNamingStrategy(): (tenantId: string) => string;
  getAllOptions(): MultiTenantModuleOptions;
}

export interface ITenantConnectionService {
  getConnectionForSchema(schema: string): Promise<TenantOrmConnection>;
  getTenantConnection(): Promise<TenantOrmConnection>;
  closeAllConnections(): Promise<void>;
  getConnectionPoolStats(): IConnectionPoolStats;
  removeConnection(schema: string): Promise<void>;
  getOrmType(): string;
}

// /**
//  * Repository factory type for TypeORM
//  */
// export type TenantRepositoryFactory<T> = (
//   tenantId: string,
// ) => Promise<import('typeorm').Repository<T>>;

// /**
//  * Database factory type for Drizzle
//  */
// export type TenantDrizzleDbFactory = (
//   tenantId: string,
// ) => Promise<import('drizzle-orm/node-postgres').NodePgDatabase>;
