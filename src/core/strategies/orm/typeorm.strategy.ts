import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

import { getMultiTenantDatabaseConfig } from '../../../config/database.config';
import { EntityName } from '../../../constants';
import {
  IOrmStrategy,
  isTypeOrmConnection,
  TenantOrmConnection,
} from '../../interfaces/orm-abstraction.interface';
import { DatabaseConfig } from '../../interfaces/typeorm.interface';
import { getEntityClasses } from '../../utils/entity-registry.utils';

/**
 * TypeORM implementation of the ORM strategy
 */
@Injectable()
export class TypeOrmStrategy implements IOrmStrategy {
  readonly type = 'typeorm' as const;
  private readonly logger = new Logger(TypeOrmStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseConfig?: DatabaseConfig,
  ) {}

  async createConnection(
    schema: string,
    enabledEntities?: string[],
  ): Promise<TenantOrmConnection> {
    this.logger.debug(`Creating TypeORM connection for schema: ${schema}`);

    const entities =
      enabledEntities && enabledEntities.length > 0
        ? getEntityClasses(enabledEntities as EntityName[])
        : undefined;

    const config = getMultiTenantDatabaseConfig(
      this.configService,
      schema,
      enabledEntities as EntityName[],
      this.databaseConfig,
    ) as DataSourceOptions;

    const dataSource = new DataSource({
      ...config,
      name: `tenant_${schema}`,
      entities: entities as (string | (new () => unknown))[],
    });

    try {
      await dataSource.initialize();
      this.logger.log(`TypeORM connection initialized for schema: ${schema}`);

      return {
        type: 'typeorm',
        dataSource,
        isInitialized: () => dataSource.isInitialized,
        destroy: async () => {
          if (dataSource.isInitialized) {
            await dataSource.destroy();
          }
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create TypeORM connection for schema ${schema}:`,
        error,
      );
      throw error;
    }
  }

  isConnectionValid(connection: TenantOrmConnection): boolean {
    if (!isTypeOrmConnection(connection)) {
      return false;
    }
    return connection.dataSource.isInitialized;
  }

  async destroyConnection(connection: TenantOrmConnection): Promise<void> {
    if (!isTypeOrmConnection(connection)) {
      throw new Error('Invalid connection type for TypeORM strategy');
    }

    if (connection.dataSource.isInitialized) {
      await connection.dataSource.destroy();
      this.logger.log('TypeORM connection destroyed');
    }
  }
}
