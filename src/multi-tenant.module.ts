import { HttpService } from '@nestjs/axios';
import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
  Provider,
  Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { TenantAdminController } from './admin/controllers/tenant-admin.controller';
import { Tenant } from './admin/entities/tenant.entity';
import { TENANT_ADMIN_SERVICE } from './admin/interfaces/tenant-admin.interface';
import { TENANT_MANAGEMENT_STRATEGY } from './admin/interfaces/tenant-management.interface';
import { TENANT_VALIDATION_STRATEGY } from './admin/interfaces/tenant-validation.interface';
import { TenantAdminService } from './admin/services/tenant-admin.service';
import { getAdminDatabaseConfig } from './config/database.config';
import {
  IMultiTenantConfigService,
  MultiTenantModuleAsyncOptions,
  MultiTenantModuleOptions,
} from './core/interfaces/tenant.interface';
import { TenantFastifyMiddleware } from './core/middleware/tenant-fastify.middleware';
import { TenantResolverMiddleware } from './core/middleware/tenant-resolver.middleware';
import { TenantDataSourceProvider } from './core/providers/tenant-repository.provider';
import {
  MULTI_TENANT_CONFIG_SERVICE,
  MultiTenantConfigService,
} from './core/services/multi-tenant-config.service';
import {
  TENANT_CONNECTION_SERVICE,
  TenantConnectionService,
} from './core/services/tenant-connection.service';
import {
  TENANT_CONTEXT_SERVICE,
  TenantContextService,
} from './core/services/tenant-context.service';
import { LocalTenantValidationStrategy } from './core/strategies/local-tenant-validation.strategy';
import { RemoteTenantValidationStrategy } from './core/strategies/remote-tenant-validation.strategy';

type ImportType = (Type<unknown> | DynamicModule | Promise<DynamicModule>)[];

@Global()
@Module({})
export class MultiTenantModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(MultiTenantModule.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject('MULTI_TENANT_OPTIONS')
    private readonly options: MultiTenantModuleOptions,
  ) {}

  async onModuleInit() {
    this.logger.log(
      `Multi-tenant module initialized with strategy: ${this.options.validationStrategy || 'local'}`,
    );

    // If the dev provided custom controllers, validate that they are loaded
    if (this.options.customControllers?.length) {
      this.logger.log(
        `Multi-tenant module initialized with custom controllers: ${this.options.customControllers?.length}`,
      );
    }

    // If using local validation, verify that TypeORM admin is available
    if (this.options.validationStrategy === 'local') {
      try {
        this.moduleRef.get(DataSource, {
          strict: false,
        });

        this.logger.log('Admin datasource connection verified successfully');
      } catch {
        this.logger.warn(
          'Admin database connection not found. Make sure to include TypeORM admin imports.',
        );
      }
    }
  }

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

    const imports: ImportType = [...(options.customImports || [])];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controllers: Type<any>[] = [...(options.customControllers || [])];

    // Determine validation strategy
    const validationStrategy = this.resolveValidationStrategy(options);
    providers.push(validationStrategy);

    // Only load admin if using local validation
    if (options.validationStrategy === 'local' || !options.validationStrategy) {
      imports.push(
        TypeOrmModule.forRootAsync({
          name: 'admin',
          inject: [ConfigService],
          useFactory: (configService: ConfigService) =>
            getAdminDatabaseConfig(configService, options.database),
        }),
        TypeOrmModule.forFeature([Tenant], 'admin'),
      );

      // Only load TenantAdminService if NO customProviders
      if (
        options.enableAdminModule !== false &&
        !options.customProviders?.some(
          p =>
            (typeof p === 'object' &&
              'provide' in p &&
              p.provide === TENANT_ADMIN_SERVICE) ||
            (typeof p === 'object' &&
              'provide' in p &&
              p.provide === TENANT_MANAGEMENT_STRATEGY),
        )
      ) {
        // Only use defaults if dev did not provide their own
        providers.push(
          {
            provide: TENANT_ADMIN_SERVICE,
            useClass: TenantAdminService,
          },
          {
            provide: TENANT_MANAGEMENT_STRATEGY,
            useClass: TenantAdminService,
          },
        );

        if (!options.customControllers?.length) {
          controllers.push(TenantAdminController);
        }
      }
    }

    // Add custom suppliers AFTER
    if (options.customProviders) {
      providers.push(...options.customProviders);
    }

    return {
      module: MultiTenantModule,
      imports,
      providers,
      controllers,
      exports: [
        MULTI_TENANT_CONFIG_SERVICE,
        TENANT_CONTEXT_SERVICE,
        TENANT_CONNECTION_SERVICE,
        TENANT_VALIDATION_STRATEGY,
        TenantDataSourceProvider,
        ...(options.validationStrategy === 'local' &&
        options.enableAdminModule !== false
          ? [TENANT_MANAGEMENT_STRATEGY]
          : []),
      ],
    };
  }

  static forRootAsync(options: MultiTenantModuleAsyncOptions): DynamicModule {
    const asyncProviders: Provider[] = [
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
    ];

    // Validation strategy
    if (options.validationStrategyProvider) {
      asyncProviders.push(options.validationStrategyProvider);
    } else {
      // Create the strategy based on the options
      asyncProviders.push({
        provide: TENANT_VALIDATION_STRATEGY,
        useFactory: (
          moduleOptions: MultiTenantModuleOptions,
          httpService?: HttpService,
          tenantRepository?: Repository<Tenant>,
        ) => {
          const strategy = moduleOptions.validationStrategy || 'local';

          switch (strategy) {
            case 'remote': {
              if (!httpService) {
                throw new Error(
                  'HttpService is required for remote validation strategy. Add HttpModule to imports.',
                );
              }
              return new RemoteTenantValidationStrategy(
                httpService,
                moduleOptions.remoteServiceUrl!,
              );
            }

            case 'local': {
              if (!tenantRepository) {
                throw new Error(
                  'TenantRepository is required for local validation strategy. Add TypeOrmModule.forFeature([Tenant]) to imports of MultiTenantModule',
                );
              }
              return new LocalTenantValidationStrategy(tenantRepository);
            }

            case 'custom': {
              throw new Error(
                'Custom validation strategy requires validationStrategyProvider',
              );
            }

            default: {
              throw new Error(
                'Invalid validation strategy. Use "remote", "local", or "custom"',
              );
            }
          }
        },
        inject: [
          'MULTI_TENANT_OPTIONS',
          {
            token: HttpService,
            optional: true,
          },
          {
            token: getRepositoryToken(Tenant, 'admin'),
            optional: true,
          },
        ],
      });
    }

    // Management strategy if provided
    if (options.managementStrategyProvider) {
      asyncProviders.push(options.managementStrategyProvider);
    } else {
      // Provider conditional for management
      asyncProviders.push({
        provide: TENANT_MANAGEMENT_STRATEGY,
        useFactory: (
          moduleOptions: MultiTenantModuleOptions,
          tenantRepository?: Repository<Tenant>,
          dataSource?: DataSource,
          configService?: IMultiTenantConfigService,
        ) => {
          if (
            moduleOptions.validationStrategy === 'local' &&
            moduleOptions.enableAdminModule !== false
          ) {
            if (!tenantRepository) {
              throw new Error(
                'TenantRepository and DataSource required for local admin. Add TypeOrmModule.forFeature([Tenant]) to imports of MultiTenantModule',
              );
            }
            if (!dataSource) {
              throw new Error(
                'DataSource required for local admin. Add TypeOrmModule.forRoot() to imports of AppModule',
              );
            }
            return new TenantAdminService(
              tenantRepository,
              dataSource,
              configService,
            );
          }
          // If it is not local or disabled, returns undefined.
          return;
        },
        inject: [
          'MULTI_TENANT_OPTIONS',
          {
            token: getRepositoryToken(Tenant, 'admin'),
            optional: true,
          },
          {
            token: DataSource,
            optional: true,
          },
          {
            token: MULTI_TENANT_CONFIG_SERVICE,
            optional: true,
          },
        ],
      });
    }

    // Load controllers conditionally
    const controllerLoader: Provider = {
      provide: 'CONTROLLER_LOADER',
      useFactory: (moduleOptions: MultiTenantModuleOptions) => {
        return moduleOptions.customControllers || [];
      },
      inject: ['MULTI_TENANT_OPTIONS'],
    };

    asyncProviders.push(controllerLoader);

    return {
      module: MultiTenantModule,
      imports: options.imports || [],
      providers: asyncProviders,
      controllers: options.controllers || [],
      exports: [
        MULTI_TENANT_CONFIG_SERVICE,
        TENANT_CONTEXT_SERVICE,
        TENANT_CONNECTION_SERVICE,
        TENANT_VALIDATION_STRATEGY,
        TenantDataSourceProvider,
        TENANT_MANAGEMENT_STRATEGY,
      ],
    };
  }

  /**
   * Resolves the validation strategy based on the options.
   * @param options The options for the module.
   * @returns The validation strategy provider.
   */
  private static resolveValidationStrategy(
    options: MultiTenantModuleOptions,
  ): Provider {
    switch (options.validationStrategy) {
      case 'remote': {
        return {
          provide: TENANT_VALIDATION_STRATEGY,
          useFactory: (httpService: HttpService) => {
            if (!httpService) {
              throw new Error(
                'HttpService is required for remote validation strategy. Add HttpModule to imports',
              );
            }
            return new RemoteTenantValidationStrategy(
              httpService,
              options.remoteServiceUrl!,
            );
          },
          inject: [{ token: HttpService, optional: false }],
        };
      }
      case 'custom': {
        // The developer must provide their own strategy in customProviders.
        return {
          provide: TENANT_VALIDATION_STRATEGY,
          useValue: undefined, // It will be overwritten by customProviders.
        };
      }
      default: {
        return {
          provide: TENANT_VALIDATION_STRATEGY,
          useClass: LocalTenantValidationStrategy,
        };
      }
    }
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
