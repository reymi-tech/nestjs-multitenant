import { Provider } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

import {
  ITenantConnectionService,
  ITenantContextService,
} from '../interface/tenant.interface';
import { TENANT_CONNECTION_SERVICE } from '../modules/service/tenant-connection.service';
import { TENANT_CONTEXT_SERVICE } from '../modules/service/tenant-context.service';
import {
  getTenantRepositoryToken,
  TOKEN_CONSTANTS,
} from '../utils/generate-token.provider';

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

      const dataSource = await tenantConnectionService.getConnectionForSchema(
        tenantContext.tenantSchema,
      );
      return dataSource.getRepository(entity);
    },
    inject: [TENANT_CONNECTION_SERVICE, TENANT_CONTEXT_SERVICE],
  };
}

export function createTenantRepositoryProviders(
  entities: EntityTarget<ObjectLiteral>[],
): Provider[] {
  return entities.map(entity => createTenantRepositoryProvider(entity));
}

export const TenantDataSourceProvider: Provider = {
  provide: TOKEN_CONSTANTS.DATA_SOURCE,
  useFactory: async (
    tenantConnectionService: ITenantConnectionService,
    tenantContextService: ITenantContextService,
  ): Promise<DataSource> => {
    const tenantContext = tenantContextService.getContext();

    if (!tenantContext || !tenantContext.tenantSchema) {
      throw new Error('No tenant context available for data source creation');
    }

    return tenantConnectionService.getConnectionForSchema(
      tenantContext.tenantSchema,
    );
  },
  inject: [TENANT_CONNECTION_SERVICE, TENANT_CONTEXT_SERVICE],
};

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
      const dataSource =
        await tenantConnectionService.getConnectionForSchema(schemaName);
      return dataSource.getRepository(entity);
    },
    inject: [TENANT_CONNECTION_SERVICE],
  };
}

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
        const dataSource =
          await tenantConnectionService.getConnectionForSchema(schemaName);
        return dataSource.getRepository(entity);
      };
    },
    inject: [TENANT_CONNECTION_SERVICE],
  };
}
