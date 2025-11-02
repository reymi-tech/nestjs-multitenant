import {
  DynamicModule,
  Global,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  Provider,
  Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getAdminDatabaseConfig } from '../config/database.config';
import { TenantFastifyMiddleware } from '../middleware/tenant-fastify.middleware';
import { TenantResolverMiddleware } from '../middleware/tenant-resolver.middleware';
import { TenantDataSourceProvider } from '../providers/tenant-repository.provider';
import { TenantAdminController } from './controllers/tenant-admin.controller';
import { Tenant } from './entities/tenant.entity';
import { TENANT_ADMIN_SERVICE } from './interface/core.interface';
import {
  MultiTenantModuleAsyncOptions,
  MultiTenantModuleOptions,
} from './interface/tenant.interface';
import {
  MULTI_TENANT_CONFIG_SERVICE,
  MultiTenantConfigService,
} from './service/multi-tenant-config.service';
import { TenantAdminService } from './service/tenant-admin.service';
import {
  TENANT_CONNECTION_SERVICE,
  TenantConnectionService,
} from './service/tenant-connection.service';
import {
  TENANT_CONTEXT_SERVICE,
  TenantContextService,
} from './service/tenant-context.service';

type ImportType = (Type<unknown> | DynamicModule | Promise<DynamicModule>)[];

@Global()
@Module({})
export class MultiTenantModule implements NestModule {
  private readonly logger = new Logger(MultiTenantModule.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  static forRoot(options: MultiTenantModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'MULTI_TENANT_OPTIONS',
        useValue: options,
      },
      {
        provide: MULTI_TENANT_CONFIG_SERVICE,
        useClass: MultiTenantConfigService,
      },
      {
        provide: TENANT_CONTEXT_SERVICE,
        useClass: TenantContextService,
      },
      {
        provide: TENANT_CONNECTION_SERVICE,
        useClass: TenantConnectionService,
      },
      TenantDataSourceProvider,
    ];

    const imports: (DynamicModule | Promise<DynamicModule>)[] = [];
    if (options.enableAdminModule !== false) {
      imports.push(
        TypeOrmModule.forRootAsync({
          name: 'admin',
          inject: [ConfigService],
          useFactory: (configService: ConfigService) =>
            getAdminDatabaseConfig(configService, options.database),
        }),
        TypeOrmModule.forFeature([Tenant], 'admin'),
      );

      providers.push({
        provide: TENANT_ADMIN_SERVICE,
        useClass: TenantAdminService,
      });
    }

    return {
      module: MultiTenantModule,
      imports: imports as ImportType,
      providers,
      controllers:
        options.enableAdminModule === false ? [] : [TenantAdminController],
      exports: [
        MULTI_TENANT_CONFIG_SERVICE,
        TENANT_CONTEXT_SERVICE,
        TENANT_CONNECTION_SERVICE,
        TenantDataSourceProvider,
        ...(options.enableAdminModule === false ? [] : [TENANT_ADMIN_SERVICE]),
      ],
    };
  }

  static forRootAsync(options: MultiTenantModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'MULTI_TENANT_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: MULTI_TENANT_CONFIG_SERVICE,
        useClass: MultiTenantConfigService,
      },
      {
        provide: TENANT_CONTEXT_SERVICE,
        useClass: TenantContextService,
      },
      {
        provide: TENANT_CONNECTION_SERVICE,
        useClass: TenantConnectionService,
      },
      TenantDataSourceProvider,
      {
        provide: TENANT_ADMIN_SERVICE,
        useClass: TenantAdminService,
      },
    ];

    const imports: unknown[] = [
      ...(options.imports || []),
      // Always include admin database connection for forRootAsync
      // The enableAdminModule flag will be checked at runtime
      TypeOrmModule.forRootAsync({
        name: 'admin',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          // Use default database config since we can't access module options here
          // The enableAdminModule flag will be checked at runtime in services
          return getAdminDatabaseConfig(configService);
        },
      }),
      TypeOrmModule.forFeature([Tenant], 'admin'),
    ];

    return {
      module: MultiTenantModule,
      imports: imports as ImportType,
      providers,
      controllers: [TenantAdminController],
      exports: [
        MULTI_TENANT_CONFIG_SERVICE,
        TENANT_CONTEXT_SERVICE,
        TENANT_CONNECTION_SERVICE,
        TenantDataSourceProvider,
        TENANT_ADMIN_SERVICE,
      ],
    };
  }

  /**
   * Configures the tenant middleware based on the platform.
   * @param consumer - The middleware consumer.
   */
  configure(consumer: MiddlewareConsumer) {
    try {
      const config = this.moduleRef.get<MultiTenantModuleOptions>(
        'MULTI_TENANT_OPTIONS',
        { strict: false },
      );
      const platform = config?.platform || 'express';

      this.logger.log(
        `Configuring tenant middleware for platform: ${platform}`,
      );

      switch (platform) {
        case 'express': {
          consumer.apply(TenantResolverMiddleware).forRoutes('*');
          break;
        }
        case 'fastify': {
          consumer.apply(TenantFastifyMiddleware).forRoutes('*');
          break;
        }
        default: {
          consumer.apply(TenantResolverMiddleware).forRoutes('*');
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        'Error configuring tenant middleware. Falling back to Express middleware.',
        error instanceof Error ? error.stack : String(error),
      );
      // Fallback to Express middleware if config is not available
      consumer.apply(TenantResolverMiddleware).forRoutes('*');
    }
  }
}
