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
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DataSource, Repository } from 'typeorm';

import { TenantAdminController } from './admin/controllers/tenant-admin.controller';
import { Tenant } from './admin/entities/tenant.entity';
import { TENANT_ADMIN_SERVICE } from './admin/interfaces/tenant-admin.interface';
import {
  ADMIN_DATABASE,
  DrizzleTenantAdminService,
} from './admin/services/drizzle-tenant-admin.service';
import { TenantAdminService } from './admin/services/tenant-admin.service';
import { getAdminDatabaseConfig } from './config/database.config';
import {
  BuildMultitenantModuleOptions,
  IMultiTenantConfigService,
  MultiTenantModuleAsyncOptions,
  MultiTenantModuleOptions,
} from './core/interfaces/tenant.interface';
import { TENANT_VALIDATION_STRATEGY } from './core/interfaces/tenant-validation.interface';
import { TenantFastifyMiddleware } from './core/middleware/tenant-fastify.middleware';
import { TenantResolverMiddleware } from './core/middleware/tenant-resolver.middleware';
import { AdminDatabaseProvider } from './core/providers/admin-database.provider';
import {
  TenantDataSourceProvider,
  TenantDrizzleDbProvider,
} from './core/providers/tenant-repository.provider';
import {
  MULTI_TENANT_CONFIG_SERVICE,
  MultiTenantConfigService,
} from './core/services/multi-tenant-config.service';
import {
  ORM_STRATEGY,
  TENANT_CONNECTION_SERVICE,
  TenantConnectionService,
} from './core/services/tenant-connection.service';
import {
  TENANT_CONTEXT_SERVICE,
  TenantContextService,
} from './core/services/tenant-context.service';
import { DrizzleStrategy } from './core/strategies/orm/drizzle.strategy';
import { TypeOrmStrategy } from './core/strategies/orm/typeorm.strategy';
import { DrizzleLocalTenantValidationStrategy } from './core/strategies/validation/drizzle-local-tenant-validation.strategy';
import { LocalTenantValidationStrategy } from './core/strategies/validation/local-tenant-validation.strategy';
import { RemoteTenantValidationStrategy } from './core/strategies/validation/remote-tenant-validation.strategy';

type ImportType = (Type<unknown> | DynamicModule | Promise<DynamicModule>)[];
type ExportType = (symbol | Provider)[];
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
    const ormType = this.options.orm?.type || 'typeorm';

    this.logger.log(
      `Multi-tenant module initialized with strategy: ${
        this.options.validationStrategy || 'local'
      }, ORM: ${ormType}`,
    );

    // If the dev provided custom controllers, validate that they are loaded
    if (this.options.customControllers?.length) {
      this.logger.log(
        `Multi-tenant module initialized with custom controllers: ${this.options.customControllers?.length}`,
      );
    }

    // If using local validation, verify that TypeORM admin is available
    if (ormType === 'typeorm' && this.options.validationStrategy === 'local') {
      try {
        this.moduleRef.get(DataSource, { strict: false });

        this.logger.log('Admin datasource connection verified successfully');
      } catch {
        this.logger.warn(
          'Admin database connection not found. Make sure to include TypeORM admin imports.',
        );
      }
    }

    if (ormType === 'drizzle') {
      this.logger.log(
        'Using Drizzle ORM. Admin module available with Drizzle support.',
      );
    }
  }

  static forRoot(options: MultiTenantModuleOptions): DynamicModule {
    const ormType = options.orm?.type || 'typeorm';
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
    ];

    const imports: ImportType = [...(options.customImports || [])];

    const controllers: Type<unknown>[] = [...(options.customControllers || [])];

    // Add ORM-specific strategy
    providers.push(this.resolveOrmStrategy(options, ormType));

    // Add ORM-specific providers
    if (ormType === 'typeorm') {
      providers.push(TenantDataSourceProvider);
    } else if (ormType === 'drizzle') {
      providers.push(TenantDrizzleDbProvider);
    }

    // Determine validation strategy
    const validationStrategy = this.resolveValidationStrategy(options, ormType);
    providers.push(validationStrategy);

    // Admin module configuration based on ORM and validation strategy
    if (options.validationStrategy === 'local' || !options.validationStrategy) {
      if (ormType === 'typeorm') {
        // TypeORM admin setup
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
              typeof p === 'object' &&
              'provide' in p &&
              p.provide === TENANT_ADMIN_SERVICE,
          )
        ) {
          // Only use defaults if dev did not provide their own
          providers.push({
            provide: TENANT_ADMIN_SERVICE,
            useClass: TenantAdminService,
          });

          if (!options.customControllers?.length) {
            controllers.push(TenantAdminController);
          }
        }
      } else if (ormType === 'drizzle') {
        // Drizzle admin setup
        providers.push(AdminDatabaseProvider);

        if (
          options.enableAdminModule !== false &&
          !options.customProviders?.some(
            p =>
              typeof p === 'object' &&
              'provide' in p &&
              p.provide === TENANT_ADMIN_SERVICE,
          )
        ) {
          providers.push({
            provide: TENANT_ADMIN_SERVICE,
            useClass: DrizzleTenantAdminService,
          });

          if (!options.customControllers?.length) {
            controllers.push(TenantAdminController);
          }
        }
      }
    }

    // Add custom providers AFTER
    if (options.customProviders) {
      providers.push(...options.customProviders);
    }

    const exportedProviders: ExportType = [
      MULTI_TENANT_CONFIG_SERVICE,
      TENANT_CONTEXT_SERVICE,
      TENANT_CONNECTION_SERVICE,
      TENANT_VALIDATION_STRATEGY,
      ORM_STRATEGY,
    ];

    // Add ORM-specific exports
    if (ormType === 'typeorm') {
      exportedProviders.push(TenantDataSourceProvider);
    } else if (ormType === 'drizzle') {
      exportedProviders.push(TenantDrizzleDbProvider);
      if (
        options.validationStrategy === 'local' ||
        !options.validationStrategy
      ) {
        exportedProviders.push(ADMIN_DATABASE);
      }
    }

    return {
      module: MultiTenantModule,
      imports,
      providers,
      controllers,
      exports: exportedProviders,
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
    ];

    const imports = [...(options.imports || [])];
    const controllers: Type<unknown>[] = [];

    // ORM Strategy Provider
    if (options.ormStrategyProvider) {
      asyncProviders.push(options.ormStrategyProvider);
    } else {
      asyncProviders.push({
        provide: ORM_STRATEGY,
        useFactory: (
          moduleOptions: MultiTenantModuleOptions,
          configService: ConfigService,
        ) => {
          const ormType = moduleOptions.orm?.type || 'typeorm';
          const ormConfig = moduleOptions.orm;
          const databaseConfig = moduleOptions.database;

          switch (ormType) {
            case 'typeorm': {
              return new TypeOrmStrategy(configService, databaseConfig);
            }
            case 'drizzle': {
              return new DrizzleStrategy(
                configService,
                ormConfig,
                databaseConfig,
              );
            }
            default: {
              throw new Error(`Unsupported ORM type: ${ormType}`);
            }
          }
        },
        inject: ['MULTI_TENANT_OPTIONS', ConfigService],
      });
    }

    // ORM-specific providers
    asyncProviders.push(
      TenantDataSourceProvider,
      TenantDrizzleDbProvider,
      AdminDatabaseProvider,
    );

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
          adminDb?: NodePgDatabase,
        ) => {
          const strategy = moduleOptions.validationStrategy || 'local';
          const ormType = moduleOptions.orm?.type || 'typeorm';

          switch (strategy) {
            case 'remote': {
              if (!httpService) {
                throw new Error(
                  'HttpService is required for remote validation strategy. Add HttpModule to imports.',
                );
              }
              if (!moduleOptions.remoteServiceUrl) {
                throw new Error(
                  'remoteServiceUrl is required for remote validation strategy.',
                );
              }
              return new RemoteTenantValidationStrategy(
                httpService,
                moduleOptions.remoteServiceUrl!,
              );
            }

            case 'local': {
              if (ormType === 'typeorm') {
                if (!tenantRepository) {
                  throw new Error(
                    'TenantRepository is required for local validation strategy. Add TypeOrmModule.forFeature([Tenant]) to imports of MultiTenantModule',
                  );
                }
                return new LocalTenantValidationStrategy(tenantRepository);
              } else if (ormType === 'drizzle') {
                if (!adminDb) {
                  throw new Error(
                    'Admin database is required for local validation strategy with Drizzle.',
                  );
                }
                return new DrizzleLocalTenantValidationStrategy(adminDb);
              }
              throw new Error(
                `Unsupported ORM type for local validation: ${ormType}. Use 'typeorm' or 'drizzle'.`,
              );
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
          {
            token: ADMIN_DATABASE,
            optional: true,
          },
        ],
      });
    }

    // Management strategy (TENANT_ADMIN_SERVICE)
    if (options.managementStrategyProvider) {
      asyncProviders.push(options.managementStrategyProvider);
    } else {
      // Provider conditional for management
      asyncProviders.push({
        provide: TENANT_ADMIN_SERVICE,
        useFactory: (
          moduleOptions: MultiTenantModuleOptions,
          tenantRepository?: Repository<Tenant>,
          typeormDataSource?: DataSource,
          drizzleDb?: NodePgDatabase,
          configService?: IMultiTenantConfigService,
        ) => {
          // Only create if admin module is enabled
          if (moduleOptions.enableAdminModule === false) {
            return;
          }

          const validationStrategy =
            moduleOptions.validationStrategy || 'local';
          if (validationStrategy !== 'local') {
            return;
          }

          const ormType = moduleOptions.orm?.type || 'typeorm';

          if (ormType === 'typeorm') {
            if (!tenantRepository) {
              throw new Error(
                'TenantRepository required for local admin. Add TypeOrmModule.forFeature([Tenant]) to imports of MultiTenantModule',
              );
            }
            if (!typeormDataSource) {
              throw new Error(
                'DataSource required for local admin. Add TypeOrmModule.forRoot() to imports of AppModule',
              );
            }
            return new TenantAdminService(
              tenantRepository,
              typeormDataSource,
              configService,
            );
          } else if (ormType === 'drizzle') {
            if (!drizzleDb) {
              throw new Error('Admin database required for Drizzle admin.');
            }
            return new DrizzleTenantAdminService(drizzleDb, configService);
          }

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
            token: ADMIN_DATABASE,
            optional: true,
          },
          {
            token: MULTI_TENANT_CONFIG_SERVICE,
            optional: true,
          },
        ],
      });
    }

    // FIX: Merge controllers from options
    // options.controllers are user-provided at configuration time
    if (options.controllers?.length) {
      controllers.push(...options.controllers);
    }

    return {
      module: MultiTenantModule,
      imports,
      providers: asyncProviders,
      controllers,
      exports: [
        MULTI_TENANT_CONFIG_SERVICE,
        TENANT_CONTEXT_SERVICE,
        TENANT_CONNECTION_SERVICE,
        TENANT_VALIDATION_STRATEGY,
        ORM_STRATEGY,
        TENANT_ADMIN_SERVICE,
        TenantDataSourceProvider,
        TenantDrizzleDbProvider,
        ADMIN_DATABASE,
      ],
    };
  }

  /**
   * Resolves the ORM strategy based on the options
   */
  private static resolveOrmStrategy(
    options: MultiTenantModuleOptions,
    ormType: string,
  ): Provider {
    return {
      provide: ORM_STRATEGY,
      useFactory: (configService: ConfigService) => {
        switch (ormType) {
          case 'typeorm': {
            return new TypeOrmStrategy(configService, options.database);
          }
          case 'drizzle': {
            return new DrizzleStrategy(
              configService,
              options.orm,
              options.database,
            );
          }
          default: {
            throw new Error(`Unsupported ORM type: ${ormType}`);
          }
        }
      },
      inject: [ConfigService],
    };
  }

  /**
   * Resolves the validation strategy based on the options and ORM type
   * @param options The options for the module.
   * @returns The validation strategy provider.
   */
  private static resolveValidationStrategy(
    options: MultiTenantModuleOptions,
    ormType: string,
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
        // Local validation - different implementation based on ORM
        return ormType === 'drizzle'
          ? {
              provide: TENANT_VALIDATION_STRATEGY,
              useClass: DrizzleLocalTenantValidationStrategy,
            }
          : {
              provide: TENANT_VALIDATION_STRATEGY,
              useClass: LocalTenantValidationStrategy,
            };
      }
    }
  }

  /**
   * HELPER METHOD: Build properly configured forRootAsync options
   *
   * This helper makes it easier for users to configure the module correctly
   * by handling the complexity of TypeORM/Drizzle setup.
   */
  static buildAsyncConfig(
    config: BuildMultitenantModuleOptions,
  ): MultiTenantModuleAsyncOptions {
    const {
      useFactory,
      inject,
      ormType = 'typeorm',
      enableAdminController = true,
      additionalImports = [],
      additionalControllers = [],
      managementStrategyProvider,
    } = config;

    const imports = [...additionalImports];
    const controllers: Type<unknown>[] = [...additionalControllers];

    // Add TypeORM admin imports if needed
    if (ormType === 'typeorm') {
      imports.push(
        TypeOrmModule.forRootAsync({
          name: 'admin',
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            // Get database config from the user's factory
            const moduleOptions = await useFactory(
              ...(inject || []).map(() => configService),
            );
            return getAdminDatabaseConfig(
              configService,
              moduleOptions.database,
            );
          },
        }),
        TypeOrmModule.forFeature([Tenant], 'admin'),
      );
    }

    // Add TenantAdminController if admin is enabled
    if (enableAdminController) {
      controllers.push(TenantAdminController);
    }

    return {
      useFactory,
      inject,
      imports,
      controllers,
      managementStrategyProvider,
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
