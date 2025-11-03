import { Inject, Injectable } from '@nestjs/common';

import { EntityRegistryType } from '../../config/entity.registry';
import { EntityName, TenantPreset } from '../../constants';
import {
  IMultiTenantConfigService,
  MultiTenantModuleOptions,
  TenantResolutionConfig,
} from '../../interface/tenant.interface';
import {
  ConnectionPoolConfig,
  DatabaseConfig,
} from '../../interface/typeorm.interface';

/**
 * Symbol for multi-tenant config service
 */
export const MULTI_TENANT_CONFIG_SERVICE = Symbol('IMultiTenantConfigService');

/**
 * Configuration service for multi-tenant module
 * Provides centralized access to module configuration
 */
@Injectable()
export class MultiTenantConfigService implements IMultiTenantConfigService {
  constructor(
    @Inject('MULTI_TENANT_OPTIONS')
    private readonly options: MultiTenantModuleOptions,
  ) {}

  /**
   * Get database configuration for multi-tenant module
   * @returns DatabaseConfig
   */
  getDatabaseConfig(): DatabaseConfig {
    return this.options.database;
  }

  /**
   * Get tenant resolution configuration for multi-tenant module
   * @returns TenantResolutionConfig
   */
  getTenantResolutionConfig(): TenantResolutionConfig {
    return (
      this.options.tenantResolution || {
        strategy: 'header',
        headerName: 'x-tenant-id',
        defaultTenant: 'default',
      }
    );
  }

  /**
   * Get connection pool configuration for multi-tenant module
   * @returns ConnectionPoolConfig
   */
  getConnectionPoolConfig(): ConnectionPoolConfig {
    return (
      this.options.connectionPool || {
        maxConnections: 50,
        idleTimeout: 300_000,
        enableCleanup: true,
        cleanupInterval: 60_000,
      }
    );
  }

  /**
   * Check if admin module is enabled for multi-tenant module
   * @returns boolean
   */
  isAdminModuleEnable(): boolean {
    return this.options.enableAdminModule || false;
  }

  /**
   * Get entity registry configuration for multi-tenant module
   * @returns EntityRegistryType
   */
  getEntityRegistry(): EntityRegistryType {
    return this.options.entityRegistry || {};
  }

  /**
   * Get default entity presets for multi-tenant module
   * @returns Record<TenantPreset, EntityName[]>
   */
  getDefaultEntityPresets(): Record<TenantPreset, EntityName[]> {
    return this.options.defaultEntityPresets || {};
  }

  /**
   * Check if auto creation of schemas is enabled for multi-tenant module
   * @returns boolean
   */
  isAutoCreateSchemasEnabled(): boolean {
    return this.options.autoCreateSchemas || false;
  }

  /**
   * Get schema naming strategy for multi-tenant module
   * @returns (tenantId: string) => string
   */
  getSchemaNamingStrategy(): (tenantId: string) => string {
    return (
      this.options.schemaNamingStrategy ||
      ((tenantId: string) => {
        const sanitized = tenantId.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');
        return tenantId === 'default' ? 'default' : `tenant_${sanitized}`;
      })
    );
  }

  /**
   * Get all module options for multi-tenant module
   * @returns MultiTenantModuleOptions
   */
  getAllOptions(): MultiTenantModuleOptions {
    return this.options;
  }
}
