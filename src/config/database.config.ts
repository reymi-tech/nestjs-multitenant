import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EntitySchema } from 'typeorm';

import { EntityName } from '../constants';
import { DatabaseConfig } from '../interface/typeorm.interface';
import { Tenant } from '../modules/entities/tenant.entity';
import { getEntityClasses } from '../utils/entity-registry.utils';

/**
 * Configures the database connection for administrative operations.
 * This connection is used to manage tenant entities and migrations.
 *
 * @param configService - The NestJS ConfigService for environment variable access.
 * @param databaseConfig - Optional custom database configuration.
 * @returns TypeOrmModuleOptions for administrative database connection.
 */
export const getAdminDatabaseConfig = (
  configService: ConfigService,
  databaseConfig?: DatabaseConfig,
): TypeOrmModuleOptions => {
  const config = databaseConfig || {
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_DATABASE', 'multitenant_db'),
    synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
    logging: configService.get<boolean>('DB_LOGGING', false),
  };

  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    schema: 'public',
    synchronize: config.synchronize,
    logging: config.logging,
    ssl: config.ssl,
    entities: [Tenant], // Only administrative entities
    migrations: [__dirname + '/../migrations/admin/*{.ts,.js}'],
    migrationsRun: false,
  };
};

type Entities = (string | (new () => unknown) | EntitySchema<unknown>)[];

/**
 * Configures the database connection for multi-tenant operations.
 * This connection is used to load tenant-specific entities and migrations.
 *
 * @param configService - The NestJS ConfigService for environment variable access.
 * @param schema - The tenant schema to connect to.
 * @param enabledEntities - Optional list of enabled entities for this tenant.
 * @param databaseConfig - Optional custom database configuration.
 * @returns TypeOrmModuleOptions for multi-tenant database connection.
 */
export const getMultiTenantDatabaseConfig = (
  configService: ConfigService,
  schema: string,
  enabledEntities?: EntityName[],
  databaseConfig?: DatabaseConfig,
): TypeOrmModuleOptions => {
  const config = databaseConfig || {
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_DATABASE', 'multitenant_db'),
    synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
    logging: configService.get<boolean>('DB_LOGGING', false),
  };

  // Determine entities to load
  let entities: unknown[] = [];

  if (schema === 'public') {
    // Public schema doesn't load business entities
    entities = [];
  } else if (enabledEntities && enabledEntities.length > 0) {
    // Load only enabled entities for this tenant
    entities = getEntityClasses(enabledEntities);
  } else {
    // Fallback: load all available business entities
    entities = [__dirname + '/../**/entities/*.entity{.ts,.js}'];
  }

  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    schema: schema,
    synchronize: config.synchronize,
    logging: config.logging,
    ssl: config.ssl,
    entities: entities as Entities,
    migrations: [__dirname + '/../migrations/tenant/*{.ts,.js}'],
    migrationsRun: false,
  };
};

/**
 * Creates a DatabaseConfig object from environment variables.
 *
 * @param configService - The NestJS ConfigService for environment variable access.
 * @returns DatabaseConfig object with values from environment variables.
 */
export const createDatabaseConfigFromEnv = (
  configService: ConfigService,
): DatabaseConfig => {
  return {
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_DATABASE', 'multitenant_db'),
    synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
    logging: configService.get<boolean>('DB_LOGGING', false),
    ssl: configService.get<boolean>('DB_SSL', false),
  };
};
