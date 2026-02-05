import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as tenantSchema from '../../admin/schema/tenant.schema';
import { ADMIN_DATABASE } from '../../admin/services/drizzle-tenant-admin.service';
import { DatabaseConfig } from '../interfaces/typeorm.interface';

type AdminDatabaseType = NodePgDatabase<typeof tenantSchema>;

/**
 * Creates the admin database provider for Drizzle ORM
 * This database is used for tenant management operations
 */
export function createAdminDatabaseProvider(
  databaseConfig?: DatabaseConfig,
): Provider {
  return {
    provide: ADMIN_DATABASE,
    useFactory: (configService: ConfigService): AdminDatabaseType => {
      const config = databaseConfig || {
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'password'),
        database: configService.get<string>('DB_DATABASE', 'multitenant_db'),
      };

      const connectionString = buildConnectionString(config);

      const pool = new Pool({
        connectionString,
        max: 10, // Admin database doesn't need many connections
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 2000,
      });

      return drizzle(pool, {
        schema: tenantSchema,
        logger: config.logging || false,
      }) as AdminDatabaseType;
    },
    inject: [ConfigService],
  };
}

/**
 * Builds a PostgreSQL connection string from config
 */
function buildConnectionString(config: DatabaseConfig): string {
  const { host, port, username, password, database, ssl } = config;

  let connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;

  const params = new URLSearchParams();
  params.append('schema', 'public'); // Admin always uses public schema

  if (ssl) {
    params.append('ssl', 'true');
  }

  const queryString = params.toString();
  if (queryString) {
    connectionString += `?${queryString}`;
  }

  return connectionString;
}

/**
 * Provider for admin database connection
 * Can be used in async module configuration
 */
export const AdminDatabaseProvider: Provider = {
  provide: ADMIN_DATABASE,
  useFactory: (configService: ConfigService): AdminDatabaseType => {
    const host = configService.get<string>('DB_HOST', 'localhost');
    const port = configService.get<number>('DB_PORT', 5432);
    const username = configService.get<string>('DB_USERNAME', 'postgres');
    const password = configService.get<string>('DB_PASSWORD', 'password');
    const database = configService.get<string>('DB_DATABASE', 'multitenant_db');
    const logging = configService.get<boolean>('DB_LOGGING', false);

    const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2000,
    });

    return drizzle(pool, {
      schema: tenantSchema,
      logger: logging,
    }) as AdminDatabaseType;
  },
  inject: [ConfigService],
};
