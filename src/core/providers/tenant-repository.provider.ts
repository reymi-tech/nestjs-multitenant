import { Provider } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { EntityTarget, ObjectLiteral, Repository } from 'typeorm';

import {
  isDrizzleConnection,
  isTypeOrmConnection,
} from '../interfaces/orm-abstraction.interface';
import {
  ITenantConnectionService,
  ITenantContextService,
} from '../interfaces/tenant.interface';
import { TENANT_CONNECTION_SERVICE } from '../services/tenant-connection.service';
import { TENANT_CONTEXT_SERVICE } from '../services/tenant-context.service';
import {
  getTenantRepositoryToken,
  TOKEN_CONSTANTS,
} from '../utils/generate-token.provider';

// TYPEORM
/**
 * Creates a provider for TypeORM repository injection
 * This provider will only work when using TypeORM strategy
 */
export function createTenantRepositoryProvider<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
): Provider {
  return {
    provide: getTenantRepositoryToken(entity),
    useFactory: async (
      tenantConnectionService: ITenantConnectionService,
      tenantContextService: ITenantContextService,
    ): Promise<Repository<T>> => {
      const tenantContext = tenantContextService.getContext();

      if (!tenantContext || !tenantContext.tenantSchema) {
        throw new Error('No tenant context available for repository creation');
      }

      const connection = await tenantConnectionService.getConnectionForSchema(
        tenantContext.tenantSchema,
      );

      if (!isTypeOrmConnection(connection)) {
        throw new Error(
          'Cannot create TypeORM repository with non-TypeORM connection. Use InjectTenantDb() for Drizzle.',
        );
      }

      return connection.dataSource.getRepository(entity);
    },
    inject: [TENANT_CONNECTION_SERVICE, TENANT_CONTEXT_SERVICE],
  };
}

/**
 * Creates multiple tenant repository providers
 */
export function createTenantRepositoryProviders(
  entities: EntityTarget<ObjectLiteral>[],
): Provider[] {
  return entities.map(entity => createTenantRepositoryProvider(entity));
}

/**
 * Provider for TypeORM DataSource
 * Only available when using TypeORM strategy
 */
export const TenantDataSourceProvider: Provider = {
  provide: TOKEN_CONSTANTS.DATA_SOURCE,
  useFactory: async (
    tenantConnectionService: ITenantConnectionService,
    tenantContextService: ITenantContextService,
  ): Promise<unknown> => {
    const tenantContext = tenantContextService.getContext();

    if (!tenantContext || !tenantContext.tenantSchema) {
      throw new Error('No tenant context available for data source creation');
    }

    const connection = await tenantConnectionService.getConnectionForSchema(
      tenantContext.tenantSchema,
    );

    if (!isTypeOrmConnection(connection)) {
      throw new Error(
        'Cannot provide TypeORM DataSource with non-TypeORM connection',
      );
    }

    return connection.dataSource;
  },
  inject: [TENANT_CONNECTION_SERVICE, TENANT_CONTEXT_SERVICE],
};

/**
 * Creates a provider for tenant-specific TypeORM repository
 */
export function createSpecificTenantRepositoryProvider<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
  tenantId: string,
): Provider {
  return {
    provide: `${getTenantRepositoryToken(entity)}_${tenantId}`,
    useFactory: async (
      tenantConnectionService: ITenantConnectionService,
    ): Promise<Repository<T>> => {
      const schemaName = `tenant_${tenantId}`;
      const connection =
        await tenantConnectionService.getConnectionForSchema(schemaName);

      if (!isTypeOrmConnection(connection)) {
        throw new Error(
          'Cannot create TypeORM repository with non-TypeORM connection',
        );
      }

      return connection.dataSource.getRepository(entity);
    },
    inject: [TENANT_CONNECTION_SERVICE],
  };
}

/**
 * Creates a factory provider for TypeORM repositories
 */
export function createTenantRepositoryFactory<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
): Provider {
  return {
    provide: `${getTenantRepositoryToken(entity)}${
      TOKEN_CONSTANTS.FACTORY_SUFFIX
    }`,
    useFactory: (tenantConnectionService: ITenantConnectionService) => {
      return async (tenantId: string): Promise<Repository<T>> => {
        const schemaName = `tenant_${tenantId}`;
        const connection =
          await tenantConnectionService.getConnectionForSchema(schemaName);

        if (!isTypeOrmConnection(connection)) {
          throw new Error(
            'Cannot create TypeORM repository with non-TypeORM connection',
          );
        }

        return connection.dataSource.getRepository(entity);
      };
    },
    inject: [TENANT_CONNECTION_SERVICE],
  };
}

// DRIZZLE ORM
/**
 * Provider for Drizzle Database instance
 * Only available when using Drizzle strategy
 */
export const TenantDrizzleDbProvider: Provider = {
  provide: TOKEN_CONSTANTS.DRIZZLE_DB,
  useFactory: async (
    tenantConnectionService: ITenantConnectionService,
    tenantContextService: ITenantContextService,
  ): Promise<NodePgDatabase> => {
    const tenantContext = tenantContextService.getContext();

    if (!tenantContext || !tenantContext.tenantSchema) {
      throw new Error('No tenant context available for database creation');
    }

    const connection = await tenantConnectionService.getConnectionForSchema(
      tenantContext.tenantSchema,
    );

    if (!isDrizzleConnection(connection)) {
      throw new Error(
        'Cannot provide Drizzle DB with non-Drizzle connection. Use InjectTenantDataSource() for TypeORM.',
      );
    }

    return connection.db;
  },
  inject: [TENANT_CONNECTION_SERVICE, TENANT_CONTEXT_SERVICE],
};

/**
 * Creates a factory provider for Drizzle database instances
 */
export function createTenantDrizzleDbFactory(): Provider {
  return {
    provide: `${TOKEN_CONSTANTS.DRIZZLE_DB}${TOKEN_CONSTANTS.FACTORY_SUFFIX}`,
    useFactory: (tenantConnectionService: ITenantConnectionService) => {
      return async (tenantId: string): Promise<NodePgDatabase> => {
        const schemaName = `tenant_${tenantId}`;
        const connection =
          await tenantConnectionService.getConnectionForSchema(schemaName);

        if (!isDrizzleConnection(connection)) {
          throw new Error(
            'Cannot provide Drizzle DB with non-Drizzle connection',
          );
        }

        return connection.db;
      };
    },
    inject: [TENANT_CONNECTION_SERVICE],
  };
}
