import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { EntityName } from '../../constants';
import {
  IOrmStrategy,
  TenantOrmConnection,
} from '../interfaces/orm-abstraction.interface';
import {
  IMultiTenantConfigService,
  ITenantConnectionService,
  ITenantContextService,
} from '../interfaces/tenant.interface';
import {
  ITenantValidationStrategy,
  TENANT_VALIDATION_STRATEGY,
} from '../interfaces/tenant-validation.interface';
import { IConnectionPoolStats } from '../interfaces/typeorm.interface';
import { MULTI_TENANT_CONFIG_SERVICE } from './multi-tenant-config.service';
import { TENANT_CONTEXT_SERVICE } from './tenant-context.service';

export const TENANT_CONNECTION_SERVICE = Symbol('ITenantConnectionService');
export const ORM_STRATEGY = Symbol('IOrmStrategy');

/**
 * Service to manage tenant connections and connection pooling.
 * Implements ITenantConnectionService interface.
 */
@Injectable()
export class TenantConnectionService implements ITenantConnectionService {
  private readonly logger = new Logger(TenantConnectionService.name);
  private readonly connectionPool = new Map<string, TenantOrmConnection>();
  private readonly maxConnections: number;
  private readonly enableCleanup: boolean;
  private readonly cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @Inject(TENANT_CONTEXT_SERVICE)
    private readonly tenantContextService: ITenantContextService,

    @Inject(MULTI_TENANT_CONFIG_SERVICE)
    private readonly multiTenantConfigService: IMultiTenantConfigService,

    @Inject(ORM_STRATEGY)
    private readonly ormStrategy: IOrmStrategy,

    @Inject(TENANT_VALIDATION_STRATEGY)
    @Optional()
    private readonly tenantValidationStrategy?: ITenantValidationStrategy,
  ) {
    const poolConfig = this.multiTenantConfigService.getConnectionPoolConfig();
    this.maxConnections = poolConfig.maxConnections || 50;
    this.enableCleanup = poolConfig.enableCleanup !== false;
    this.cleanupInterval = poolConfig.cleanupInterval || 60_000; // Default 1 minute

    this.logger.log(`Initialized with ORM strategy: ${this.ormStrategy.type}`);

    if (this.enableCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get a connection for the specified schema
   * Returns the appropriate ORM connection (TypeORM DataSource or Drizzle DB)
   */
  async getConnectionForSchema(schema: string): Promise<TenantOrmConnection> {
    if (
      schema !== 'public' &&
      schema !== 'default' &&
      this.tenantValidationStrategy
    ) {
      const tenantExists =
        await this.tenantValidationStrategy.validateTenantExists(schema);

      if (!tenantExists) {
        this.logger.debug(`Tenant does not exist: ${schema}`);
        throw new NotFoundException(`Schema not found: ${schema}`);
      }
    }

    // Check if connection already exists in pool
    if (this.connectionPool.has(schema)) {
      const existingConnection = this.connectionPool.get(schema)!;
      if (this.ormStrategy.isConnectionValid(existingConnection)) {
        return existingConnection;
      } else {
        // Remove invalid connection
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

    // Create new connection using the ORM strategy
    const connection = await this.createConnection(schema);

    this.connectionPool.set(schema, connection);
    this.logger.log(
      `Created new ${this.ormStrategy.type} connection for schema: ${schema}`,
    );
    return connection;
  }

  private async cleanupOldConnections() {
    const connectionsToRemove = Math.floor(this.maxConnections * 0.1); // Remove 10%
    const connections = [...this.connectionPool.entries()];

    for (let i = 0; i < connectionsToRemove && i < connections.length; i++) {
      const [schema, connection] = connections[i];
      try {
        await this.ormStrategy.destroyConnection(connection);
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

  private async createConnection(schema: string): Promise<TenantOrmConnection> {
    const enabledEntities =
      schema === 'public'
        ? undefined
        : await this.getTenantEntityConfig(schema);

    this.logger.debug(
      `Enabled entities for tenant ${schema}: ${enabledEntities?.join(', ') || 'all'}`,
    );

    return this.ormStrategy.createConnection(schema, enabledEntities);
  }

  private async getTenantEntityConfig(
    tenantCode: string,
  ): Promise<EntityName[]> {
    if (!this.tenantValidationStrategy) {
      // Return default entities if admin service is not available
      return ['user', 'role'];
    }

    const tenant = await this.tenantValidationStrategy.findByCode(tenantCode);

    if (!tenant?.entityConfig?.enabledEntities) {
      // Default configuration if not specified
      return ['user', 'role'];
    }

    return tenant.entityConfig.enabledEntities as EntityName[];
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.performScheduledCleanup();
    }, this.cleanupInterval);
  }

  private async performScheduledCleanup() {
    // This is a simplified cleanup - in a real implementation,
    // you would track connection usage and idle time
    if (this.connectionPool.size > this.maxConnections * 0.8) {
      await this.cleanupOldConnections();
    }
  }

  // Secondary methods
  async getTenantConnection(): Promise<TenantOrmConnection> {
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

    const closePromises = [...this.connectionPool.entries()].map(
      async ([, connection]) => {
        await this.ormStrategy.destroyConnection(connection);
      },
    );

    await Promise.all(closePromises);
    this.connectionPool.clear();
    this.logger.log(`All tenant connections closed`);
  }

  getConnectionPoolStats(): IConnectionPoolStats {
    const active = [...this.connectionPool.values()].filter(connection =>
      this.ormStrategy.isConnectionValid(connection),
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
        await this.ormStrategy.destroyConnection(connection);
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

  /**
   * Get the current ORM type being used
   */
  getOrmType(): string {
    return this.ormStrategy.type;
  }
}
