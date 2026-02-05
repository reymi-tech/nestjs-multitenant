import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import {
  IOrmStrategy,
  isDrizzleConnection,
  OrmConfig,
  TenantOrmConnection,
} from '../../interfaces/orm-abstraction.interface';
import { DatabaseConfig } from '../../interfaces/typeorm.interface';

/**
 * Drizzle ORM implementation of the ORM strategy
 */
@Injectable()
export class DrizzleStrategy implements IOrmStrategy {
  readonly type = 'drizzle' as const;
  private readonly logger = new Logger(DrizzleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ormConfig?: OrmConfig,
    private readonly databaseConfig?: DatabaseConfig,
  ) {}

  async createConnection(schema: string): Promise<TenantOrmConnection> {
    this.logger.debug(`Creating Drizzle connection for schema: ${schema}`);

    const config = this.databaseConfig || {
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'password'),
      database: this.configService.get<string>('DB_DATABASE', 'multitenant_db'),
    };

    const connectionString = this.buildConnectionString(config, schema);

    try {
      const pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      const client = await pool.connect();

      // Set the search_path to the tenant schema
      await client.query(`SET search_path TO "${schema}"`);
      client.release();

      const db = drizzle(pool, {
        schema: this.ormConfig?.drizzle?.schema || {},
        logger: this.ormConfig?.drizzle?.logger || false,
      }) as NodePgDatabase<Record<string, unknown>>;

      this.logger.log(`Drizzle connection initialized for schema: ${schema}`);

      return {
        type: 'drizzle',
        db: db as NodePgDatabase,
        pool,
        isInitialized: () => true, // Pool is always "initialized" once created
        destroy: async () => {
          await pool.end();
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Drizzle connection for schema ${schema}:`,
        error,
      );
      throw error;
    }
  }

  isConnectionValid(connection: TenantOrmConnection): boolean {
    if (!isDrizzleConnection(connection)) {
      return false;
    }
    // For Drizzle, we check if the pool exists and is not ended
    return connection.pool !== undefined;
  }

  async destroyConnection(connection: TenantOrmConnection): Promise<void> {
    if (!isDrizzleConnection(connection)) {
      throw new Error('Invalid connection type for Drizzle strategy');
    }

    if (connection.pool) {
      await (connection.pool as Pool).end();
      this.logger.log('Drizzle connection destroyed');
    }
  }

  private buildConnectionString(
    config: DatabaseConfig,
    schema: string,
  ): string {
    const { host, port, username, password, database, ssl } = config;

    let connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;

    const params = new URLSearchParams();
    if (schema && schema !== 'public') {
      params.append('schema', schema);
    }
    if (ssl) {
      params.append('ssl', 'true');
    }

    const queryString = params.toString();
    if (queryString) {
      connectionString += `?${queryString}`;
    }

    return connectionString;
  }
}
