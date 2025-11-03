import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

import { getMultiTenantDatabaseConfig } from '../../config/database.config';
import { EntityName } from '../../constants';
import {
  ITenantAdminService,
  TENANT_ADMIN_SERVICE,
} from '../../interface/core.interface';
import {
  IMultiTenantConfigService,
  ITenantConnectionService,
  ITenantContextService,
} from '../../interface/tenant.interface';
import { IConnectionPoolStats } from '../../interface/typeorm.interface';
import { MULTI_TENANT_CONFIG_SERVICE } from './multi-tenant-config.service';
import { TENANT_CONTEXT_SERVICE } from './tenant-context.service';

export const TENANT_CONNECTION_SERVICE = Symbol('ITenantConnectionService');

/**
 * Service to manage tenant connections and connection pooling.
 * Implements ITenantConnectionService interface.
 */
@Injectable()
export class TenantConnectionService implements ITenantConnectionService {
  private readonly logger = new Logger(TenantConnectionService.name);
  private readonly connectionPool = new Map<string, DataSource>();
  private readonly maxConnections: number;
  private readonly enableCleanup: boolean;
  private readonly cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,

    @Inject(TENANT_CONTEXT_SERVICE)
    private readonly tenantContextService: ITenantContextService,

    @Inject(MULTI_TENANT_CONFIG_SERVICE)
    private readonly multiTenantConfigService: IMultiTenantConfigService,

    @Inject(TENANT_ADMIN_SERVICE)
    @Optional()
    private readonly tenantAdminService: ITenantAdminService,
  ) {
    const poolConfig = this.multiTenantConfigService.getConnectionPoolConfig();
    this.maxConnections = poolConfig.maxConnections || 50;
    this.enableCleanup = poolConfig.enableCleanup !== false;
    this.cleanupInterval = poolConfig.cleanupInterval || 60_000; // Default 1 minute

    if (this.enableCleanup) {
      this.startCleanupTimer();
    }
  }

  async getConnectionForSchema(schema: string): Promise<DataSource> {
    if (
      schema !== 'public' &&
      schema !== 'default' &&
      this.tenantAdminService
    ) {
      const tenantExists =
        await this.tenantAdminService.validateTenantExists(schema);

      if (!tenantExists) {
        this.logger.debug(`Tenant does not exist: ${schema}`);
        throw new NotFoundException(`Schema not found: ${schema}`);
      }
    }

    // Check if connection already exists in pool
    if (this.connectionPool.has(schema)) {
      const existingConnection = this.connectionPool.get(schema)!;
      if (existingConnection.isInitialized) {
        return existingConnection;
      } else {
        // Remove uninitialized connection
        this.connectionPool.delete(schema);
      }
    }

    // Check connection limit
    if (this.connectionPool.size >= this.maxConnections) {
      this.logger.warn(
        `Connection pool limit reached (${this.maxConnections}). Consider optimizing connection usage.`,
      );
      await this.cleanupOldConnections();
    }

    // Create new connection
    const dataSource = await this.createConnection(schema);

    this.connectionPool.set(schema, dataSource);
    this.logger.log(`Created new connection for schema: ${schema}`);
    return dataSource;
  }

  private async cleanupOldConnections() {
    const connectionsToRemove = Math.floor(this.maxConnections * 0.1); // Remove 10%
    const connections = [...this.connectionPool.entries()];

    for (let i = 0; i < connectionsToRemove && i < connections.length; i++) {
      const [schema, connection] = connections[i];
      try {
        if (connection.isInitialized) {
          await connection.destroy();
        }
        this.connectionPool.delete(schema);
        this.logger.log(`Cleaned up connection for schema: ${schema}`);
      } catch (error) {
        this.logger.error(
          `Error cleaning up connection for schema ${schema}:`,
          error,
        );
      }
    }
  }

  private async createConnection(schema: string): Promise<DataSource> {
    const enabledEntities =
      schema === 'public'
        ? undefined
        : await this.getTenantEntityConfig(schema);

    this.logger.debug(
      `Enabled entities for tenant ${schema}: with entities: ${enabledEntities}`,
    );

    const databaseConfig = this.multiTenantConfigService.getDatabaseConfig();
    const config = getMultiTenantDatabaseConfig(
      this.configService,
      schema,
      enabledEntities,
      databaseConfig,
    ) as DataSourceOptions;

    const dataSource = new DataSource({
      ...config,
      name: `tenant_${schema}`,
    });

    try {
      await dataSource.initialize();
      this.logger.log(`Connection initialized for schema: ${schema}`);
      return dataSource;
    } catch (error) {
      this.logger.error(
        `Failed to create connection for schema ${schema}:`,
        error,
      );
      throw error;
    }
  }

  private async getTenantEntityConfig(
    tenantCode: string,
  ): Promise<EntityName[]> {
    if (!this.tenantAdminService) {
      // Return default entities if admin service is not available
      return ['user', 'role'];
    }

    const tenant = await this.tenantAdminService.findByCode(tenantCode);

    if (!tenant?.entityConfig?.enabledEntities) {
      // Default configuration if not specified
      return ['user', 'role'];
    }

    return tenant.entityConfig.enabledEntities as EntityName[];
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.performScheduledClenup();
    }, this.cleanupInterval);
  }

  private async performScheduledClenup() {
    // This is a simplified cleanup - in a real implementation,
    // you would track connection usage and idle time
    if (this.connectionPool.size > this.maxConnections * 0.8) {
      await this.cleanupOldConnections();
    }
  }

  // Secundary methods
  async getTenantConnection(): Promise<DataSource> {
    const schema = this.tenantContextService.getTenantSchema();
    if (!schema) {
      throw new Error('No tenant context available');
    }
    return this.getConnectionForSchema(schema);
  }

  async closeAllConnections(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    const closePromises = [...this.connectionPool.values()].map(
      async connection => {
        if (connection.isInitialized) {
          await connection.destroy();
        }
      },
    );

    await Promise.all(closePromises);
    this.connectionPool.clear();
    this.logger.log(`All tenant connections closed`);
  }

  getConnectionPoolStats(): IConnectionPoolStats {
    const active = [...this.connectionPool.values()].filter(
      connection => connection.isInitialized,
    ).length;

    return {
      total: this.connectionPool.size,
      active,
      inactive: this.connectionPool.size - active,
      schemas: [...this.connectionPool.keys()],
    };
  }

  async removeConnection(schema: string): Promise<void> {
    const connection = this.connectionPool.get(schema);
    if (connection) {
      try {
        if (connection.isInitialized) {
          await connection.destroy();
        }
        this.connectionPool.delete(schema);
        this.logger.log(`Removed connection for schema: ${schema}`);
      } catch (error) {
        this.logger.error(
          `Error removing connection for schema ${schema}:`,
          error,
        );
      }
    }
  }
}
