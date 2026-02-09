import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  DataSource,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';

/**
 * Supported ORM types
 */
export type OrmType = 'typeorm' | 'drizzle';

/**
 * Base ORM connection interface
 * Abstracts the connection type to support multiple ORMs
 */
export interface IOrmConnection {
  readonly type: OrmType;
  isInitialized(): boolean;
  destroy(): Promise<void>;
}

/**
 * TypeORM connection wrapper
 */
export interface ITypeOrmConnection extends IOrmConnection {
  readonly type: 'typeorm';
  readonly dataSource: DataSource;
}

/**
 * Drizzle connection wrapper
 */
export interface IDrizzleConnection extends IOrmConnection {
  readonly type: 'drizzle';
  readonly db: NodePgDatabase;
  readonly pool: unknown; // Pool from pg
}

/**
 * Union type for all ORM connections
 */
export type TenantOrmConnection = ITypeOrmConnection | IDrizzleConnection;

/**
 * TypeORM-specific repository provider
 */
export interface ITypeOrmRepositoryProvider<T extends ObjectLiteral> {
  getRepository(entity: EntityTarget<T>): Repository<T>;
}

/**
 * Drizzle-specific database provider
 */
export interface IDrizzleDbProvider {
  getDb(): NodePgDatabase;
}

/**
 * ORM strategy interface
 * Defines how to create and manage connections for different ORMs
 */
export interface IOrmStrategy {
  readonly type: OrmType;

  /**
   * Create a new connection for the specified schema
   */
  createConnection(
    schema: string,
    enabledEntities?: string[],
  ): Promise<TenantOrmConnection>;

  /**
   * Check if a connection is valid and initialized
   */
  isConnectionValid(connection: TenantOrmConnection): boolean;

  /**
   * Destroy a connection
   */
  destroyConnection(connection: TenantOrmConnection): Promise<void>;
}

/**
 * ORM configuration options
 */
export interface OrmConfig {
  /**
   * ORM type to use
   */
  type: OrmType;

  /**
   * TypeORM-specific configuration (only used if type is 'typeorm')
   */
  typeorm?: {
    /**
     * Auto-load entities from file patterns
     */
    autoLoadEntities?: boolean;

    /**
     * Synchronize database schema on connection
     */
    synchronize?: boolean;

    /**
     * Enable query logging
     */
    logging?: boolean;
  };

  /**
   * Drizzle-specific configuration (only used if type is 'drizzle')
   */
  drizzle?: {
    /**
     * Drizzle schema definition
     * Should include all your schemas like { ...authSchema, ...userSchema }
     */
    schema?: Record<string, unknown>;

    /**
     * Enable query logging
     */
    logger?: boolean;
  };
}

/**
 * Type guard for TypeORM connection
 */
export function isTypeOrmConnection(
  connection: TenantOrmConnection,
): connection is ITypeOrmConnection {
  return connection.type === 'typeorm';
}

/**
 * Type guard for Drizzle connection
 */
export function isDrizzleConnection(
  connection: TenantOrmConnection,
): connection is IDrizzleConnection {
  return connection.type === 'drizzle';
}
