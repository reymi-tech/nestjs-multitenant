import { beforeEach, describe, expect, it } from 'vitest';

import { EntityRegistryType } from '../../../../src/config/entity.registry';
import { EntityName, TenantPreset } from '../../../../src/constants';
import { MultiTenantModuleOptions } from '../../../../src/core/interfaces/tenant.interface';
import {
  ConnectionPoolConfig,
  DatabaseConfig,
} from '../../../../src/core/interfaces/typeorm.interface';
import { MultiTenantConfigService } from '../../../../src/core/services/multi-tenant-config.service';

// Mock data factories
const createMockDatabaseConfig = (): DatabaseConfig => ({
  host: 'localhost',
  port: 5432,
  username: 'test_user',
  password: 'test_password',
  database: 'test_db',
  synchronize: true,
  logging: false,
  ssl: false,
});

const createMockConnectionPoolConfig = (): ConnectionPoolConfig => ({
  maxConnections: 50,
  idleTimeout: 300_000,
  enableCleanup: true,
  cleanupInterval: 60_000,
});

const createMockEntityRegistry = (): EntityRegistryType => ({
  User: { name: 'User', tableName: 'users' },
  Role: { name: 'Role', tableName: 'roles' },
  Permission: { name: 'Permission', tableName: 'permissions' },
});

const createMockEntityPresets = (): Record<TenantPreset, EntityName[]> => ({
  basic: ['User', 'Role'],
  advanced: ['User', 'Role', 'Permission'],
  minimal: ['User'],
});

const customResolver = () => 'custom-tenant';
const customStrategy = (tenantId: string) => `custom_${tenantId}`;

describe('MultiTenantConfigService', () => {
  let service: MultiTenantConfigService;
  let mockOptions: MultiTenantModuleOptions;

  const createCompleteOptions = (): MultiTenantModuleOptions => ({
    database: createMockDatabaseConfig(),
    platform: 'express',
    tenantResolution: {
      strategy: 'header',
      headerName: 'x-tenant-id',
      defaultTenant: 'default',
    },
    connectionPool: createMockConnectionPoolConfig(),
    enableAdminModule: true,
    entityRegistry: createMockEntityRegistry(),
    defaultEntityPresets: createMockEntityPresets(),
    autoCreateSchemas: true,
    schemaNamingStrategy: (tenantId: string) => `custom_${tenantId}`,
  });

  const createMinimalOptions = (): MultiTenantModuleOptions => ({
    database: createMockDatabaseConfig(),
  });

  beforeEach(() => {
    mockOptions = createCompleteOptions();
    service = new MultiTenantConfigService(mockOptions);
  });

  describe('Constructor and Initialization', () => {
    it('should create service instance with complete options', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MultiTenantConfigService);
    });

    it('should create service instance with minimal options', () => {
      const minimalOptions = createMinimalOptions();
      const minimalService = new MultiTenantConfigService(minimalOptions);

      expect(minimalService).toBeDefined();
      expect(minimalService).toBeInstanceOf(MultiTenantConfigService);
    });

    it('should store options internally', () => {
      const options = service.getAllOptions();
      expect(options).toEqual(mockOptions);
    });
  });

  describe('getDatabaseConfig', () => {
    it('should return database configuration', () => {
      const result = service.getDatabaseConfig();

      expect(result).toEqual(mockOptions.database);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(5432);
      expect(result.username).toBe('test_user');
      expect(result.password).toBe('test_password');
      expect(result.database).toBe('test_db');
    });

    it('should return database config with SSL configuration', () => {
      const sslConfig = { rejectUnauthorized: false };
      mockOptions.database.ssl = sslConfig;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getDatabaseConfig();
      expect(result.ssl).toEqual(sslConfig);
    });

    it('should return database config with logging enabled', () => {
      mockOptions.database.logging = true;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getDatabaseConfig();
      expect(result.logging).toBe(true);
    });
  });

  describe('getTenantResolutionConfig', () => {
    it('should return tenant resolution configuration when provided', () => {
      const result = service.getTenantResolutionConfig();

      expect(result).toEqual(mockOptions.tenantResolution);
      expect(result.strategy).toBe('header');
      expect(result.headerName).toBe('x-tenant-id');
      expect(result.defaultTenant).toBe('default');
    });

    it('should return default tenant resolution config when not provided', () => {
      delete mockOptions.tenantResolution;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getTenantResolutionConfig();

      expect(result).toEqual({
        strategy: 'header',
        headerName: 'x-tenant-id',
        defaultTenant: 'default',
      });
    });

    it('should handle subdomain strategy configuration', () => {
      mockOptions.tenantResolution = {
        strategy: 'subdomain',
        defaultTenant: 'main',
      };
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getTenantResolutionConfig();
      expect(result.strategy).toBe('subdomain');
      expect(result.defaultTenant).toBe('main');
    });

    it('should handle JWT strategy configuration', () => {
      mockOptions.tenantResolution = {
        strategy: 'jwt',
        jwtClaimName: 'tenant_id',
        defaultTenant: 'public',
      };
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getTenantResolutionConfig();
      expect(result.strategy).toBe('jwt');
      expect(result.jwtClaimName).toBe('tenant_id');
      expect(result.defaultTenant).toBe('public');
    });

    it('should handle custom strategy configuration', () => {
      mockOptions.tenantResolution = {
        strategy: 'custom',
        customResolver,
        defaultTenant: 'fallback',
      };
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getTenantResolutionConfig();
      expect(result.strategy).toBe('custom');
      expect(result.customResolver).toBe(customResolver);
      expect(result.defaultTenant).toBe('fallback');
    });
  });

  describe('getConnectionPoolConfig', () => {
    it('should return connection pool configuration when provided', () => {
      const result = service.getConnectionPoolConfig();

      expect(result).toEqual(mockOptions.connectionPool);
      expect(result.maxConnections).toBe(50);
      expect(result.idleTimeout).toBe(300_000);
      expect(result.enableCleanup).toBe(true);
      expect(result.cleanupInterval).toBe(60_000);
    });

    it('should return default connection pool config when not provided', () => {
      delete mockOptions.connectionPool;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getConnectionPoolConfig();

      expect(result).toEqual({
        maxConnections: 50,
        idleTimeout: 300_000,
        enableCleanup: true,
        cleanupInterval: 60_000,
      });
    });

    it('should handle custom connection pool configuration', () => {
      mockOptions.connectionPool = {
        maxConnections: 100,
        idleTimeout: 600_000,
        enableCleanup: false,
        cleanupInterval: 120_000,
      };
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getConnectionPoolConfig();
      expect(result.maxConnections).toBe(100);
      expect(result.idleTimeout).toBe(600_000);
      expect(result.enableCleanup).toBe(false);
      expect(result.cleanupInterval).toBe(120_000);
    });
  });

  describe('isAdminModuleEnable', () => {
    it('should return true when admin module is enabled', () => {
      mockOptions.enableAdminModule = true;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.isAdminModuleEnable();
      expect(result).toBe(true);
    });

    it('should return false when admin module is disabled', () => {
      mockOptions.enableAdminModule = false;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.isAdminModuleEnable();
      expect(result).toBe(false);
    });

    it('should return false when admin module is not specified (default)', () => {
      delete mockOptions.enableAdminModule;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.isAdminModuleEnable();
      expect(result).toBe(false);
    });
  });

  describe('getEntityRegistry', () => {
    it('should return entity registry when provided', () => {
      const result = service.getEntityRegistry();

      expect(result).toEqual(mockOptions.entityRegistry);
      expect(result.User).toEqual({ name: 'User', tableName: 'users' });
      expect(result.Role).toEqual({ name: 'Role', tableName: 'roles' });
      expect(result.Permission).toEqual({
        name: 'Permission',
        tableName: 'permissions',
      });
    });

    it('should return empty object when entity registry is not provided', () => {
      delete mockOptions.entityRegistry;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getEntityRegistry();
      expect(result).toEqual({});
    });

    it('should handle complex entity registry configuration', () => {
      mockOptions.entityRegistry = {
        User: {
          name: 'User',
          tableName: 'users',
          schema: 'public',
          synchronize: true,
        },
        Product: {
          name: 'Product',
          tableName: 'products',
          schema: 'catalog',
        },
      };
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getEntityRegistry();
      expect(result.User.schema).toBe('public');
      expect(result.User.synchronize).toBe(true);
      expect(result.Product.schema).toBe('catalog');
    });
  });

  describe('getDefaultEntityPresets', () => {
    it('should return default entity presets when provided', () => {
      const result = service.getDefaultEntityPresets();

      expect(result).toEqual(mockOptions.defaultEntityPresets);
      expect(result.basic).toEqual(['User', 'Role']);
      expect(result.advanced).toEqual(['User', 'Role', 'Permission']);
      expect(result.minimal).toEqual(['User']);
    });

    it('should return empty object when default entity presets are not provided', () => {
      delete mockOptions.defaultEntityPresets;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getDefaultEntityPresets();
      expect(result).toEqual({});
    });

    it('should handle empty presets', () => {
      mockOptions.defaultEntityPresets = {
        empty: [],
        single: ['User'],
      };
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getDefaultEntityPresets();
      expect(result.empty).toEqual([]);
      expect(result.single).toEqual(['User']);
    });
  });

  describe('isAutoCreateSchemasEnabled', () => {
    it('should return true when auto create schemas is enabled', () => {
      mockOptions.autoCreateSchemas = true;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.isAutoCreateSchemasEnabled();
      expect(result).toBe(true);
    });

    it('should return false when auto create schemas is disabled', () => {
      mockOptions.autoCreateSchemas = false;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.isAutoCreateSchemasEnabled();
      expect(result).toBe(false);
    });

    it('should return false when auto create schemas is not specified (default)', () => {
      delete mockOptions.autoCreateSchemas;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.isAutoCreateSchemasEnabled();
      expect(result).toBe(false);
    });
  });

  describe('getSchemaNamingStrategy', () => {
    it('should return custom schema naming strategy when provided', () => {
      mockOptions.schemaNamingStrategy = customStrategy;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getSchemaNamingStrategy();
      expect(result).toBe(customStrategy);
      expect(result('test')).toBe('custom_test');
    });

    it('should return default schema naming strategy when not provided', () => {
      delete mockOptions.schemaNamingStrategy;
      service = new MultiTenantConfigService(mockOptions);

      const strategy = service.getSchemaNamingStrategy();

      // Test default strategy behavior
      expect(strategy('default')).toBe('default');
      expect(strategy('tenant1')).toBe('tenant_tenant1');
      expect(strategy('TENANT-2')).toBe('tenant_tenant_2');
      expect(strategy('tenant@3')).toBe('tenant_tenant_3');
    });

    it('should handle default strategy with special characters', () => {
      delete mockOptions.schemaNamingStrategy;
      service = new MultiTenantConfigService(mockOptions);

      const strategy = service.getSchemaNamingStrategy();

      expect(strategy('tenant-with-dashes')).toBe('tenant_tenant_with_dashes');
      expect(strategy('tenant.with.dots')).toBe('tenant_tenant_with_dots');
      expect(strategy('tenant@with#symbols')).toBe(
        'tenant_tenant_with_symbols',
      );
      expect(strategy('UPPERCASE')).toBe('tenant_uppercase');
    });

    it('should handle default strategy with numbers', () => {
      delete mockOptions.schemaNamingStrategy;
      service = new MultiTenantConfigService(mockOptions);

      const strategy = service.getSchemaNamingStrategy();

      expect(strategy('tenant123')).toBe('tenant_tenant123');
      expect(strategy('123tenant')).toBe('tenant_123tenant');
      expect(strategy('tenant-123-test')).toBe('tenant_tenant_123_test');
    });
  });

  describe('getAllOptions', () => {
    it('should return complete module options', () => {
      const result = service.getAllOptions();

      expect(result).toEqual(mockOptions);
      expect(result).toBe(mockOptions); // Should return the same reference
    });

    it('should return minimal options when only database is provided', () => {
      const minimalOptions = createMinimalOptions();
      const minimalService = new MultiTenantConfigService(minimalOptions);

      const result = minimalService.getAllOptions();
      expect(result).toEqual(minimalOptions);
      expect(result.database).toEqual(minimalOptions.database);
      expect(result.platform).toBeUndefined();
      expect(result.tenantResolution).toBeUndefined();
    });

    it('should preserve all option properties', () => {
      const result = service.getAllOptions();

      expect(result.database).toEqual(mockOptions.database);
      expect(result.platform).toBe(mockOptions.platform);
      expect(result.tenantResolution).toEqual(mockOptions.tenantResolution);
      expect(result.connectionPool).toEqual(mockOptions.connectionPool);
      expect(result.enableAdminModule).toBe(mockOptions.enableAdminModule);
      expect(result.entityRegistry).toEqual(mockOptions.entityRegistry);
      expect(result.defaultEntityPresets).toEqual(
        mockOptions.defaultEntityPresets,
      );
      expect(result.autoCreateSchemas).toBe(mockOptions.autoCreateSchemas);
      expect(result.schemaNamingStrategy).toBe(
        mockOptions.schemaNamingStrategy,
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined database config gracefully', () => {
      mockOptions.database = undefined as any;
      service = new MultiTenantConfigService(mockOptions);

      const result = service.getDatabaseConfig();
      expect(result).toBeUndefined();
    });

    it('should handle undefined options properties', () => {
      const optionsWithUndefined = {
        database: createMockDatabaseConfig(),
        platform: undefined,
        tenantResolution: undefined,
        connectionPool: undefined,
        enableAdminModule: undefined,
        entityRegistry: undefined,
        defaultEntityPresets: undefined,
        autoCreateSchemas: undefined,
        schemaNamingStrategy: undefined,
      } as MultiTenantModuleOptions;

      service = new MultiTenantConfigService(optionsWithUndefined);

      expect(service.getTenantResolutionConfig()).toEqual({
        strategy: 'header',
        headerName: 'x-tenant-id',
        defaultTenant: 'default',
      });
      expect(service.getConnectionPoolConfig()).toEqual({
        maxConnections: 50,
        idleTimeout: 300_000,
        enableCleanup: true,
        cleanupInterval: 60_000,
      });
      expect(service.isAdminModuleEnable()).toBe(false);
      expect(service.getEntityRegistry()).toEqual({});
      expect(service.getDefaultEntityPresets()).toEqual({});
      expect(service.isAutoCreateSchemasEnabled()).toBe(false);
    });

    it('should handle empty string tenant ID in default naming strategy', () => {
      delete mockOptions.schemaNamingStrategy;
      service = new MultiTenantConfigService(mockOptions);

      const strategy = service.getSchemaNamingStrategy();
      expect(strategy('')).toBe('tenant_');
    });

    it('should handle whitespace-only tenant ID in default naming strategy', () => {
      delete mockOptions.schemaNamingStrategy;
      service = new MultiTenantConfigService(mockOptions);

      const strategy = service.getSchemaNamingStrategy();
      expect(strategy('   ')).toBe('tenant____');
    });
  });

  describe('Interface Compliance', () => {
    it('should implement IMultiTenantConfigService interface correctly', () => {
      // Verify all required methods exist
      expect(typeof service.getDatabaseConfig).toBe('function');
      expect(typeof service.getTenantResolutionConfig).toBe('function');
      expect(typeof service.getConnectionPoolConfig).toBe('function');
      expect(typeof service.isAdminModuleEnable).toBe('function');
      expect(typeof service.getEntityRegistry).toBe('function');
      expect(typeof service.getDefaultEntityPresets).toBe('function');
      expect(typeof service.isAutoCreateSchemasEnabled).toBe('function');
      expect(typeof service.getSchemaNamingStrategy).toBe('function');
      expect(typeof service.getAllOptions).toBe('function');
    });

    it('should return correct types for all methods', () => {
      expect(service.getDatabaseConfig()).toEqual(expect.any(Object));
      expect(service.getTenantResolutionConfig()).toEqual(expect.any(Object));
      expect(service.getConnectionPoolConfig()).toEqual(expect.any(Object));
      expect(typeof service.isAdminModuleEnable()).toBe('boolean');
      expect(service.getEntityRegistry()).toEqual(expect.any(Object));
      expect(service.getDefaultEntityPresets()).toEqual(expect.any(Object));
      expect(typeof service.isAutoCreateSchemasEnabled()).toBe('boolean');
      expect(typeof service.getSchemaNamingStrategy()).toBe('function');
      expect(service.getAllOptions()).toEqual(expect.any(Object));
    });
  });

  describe('Performance and Memory', () => {
    it('should not modify original options object', () => {
      const originalOptions = { ...mockOptions };

      // Call all methods that return configurations
      service.getDatabaseConfig();
      service.getTenantResolutionConfig();
      service.getConnectionPoolConfig();
      service.getEntityRegistry();
      service.getDefaultEntityPresets();

      expect(mockOptions).toEqual(originalOptions);
    });

    it('should handle multiple calls efficiently', () => {
      const startTime = performance.now();

      // Call methods multiple times
      for (let i = 0; i < 1000; i++) {
        service.getDatabaseConfig();
        service.getTenantResolutionConfig();
        service.getConnectionPoolConfig();
        service.isAdminModuleEnable();
        service.getEntityRegistry();
        service.getDefaultEntityPresets();
        service.isAutoCreateSchemasEnabled();
        service.getSchemaNamingStrategy();
        service.getAllOptions();
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (less than 100ms for 1000 iterations)
      expect(executionTime).toBeLessThan(100);
    });

    it('should maintain consistent results across multiple calls', () => {
      const firstCall = {
        database: service.getDatabaseConfig(),
        tenantResolution: service.getTenantResolutionConfig(),
        connectionPool: service.getConnectionPoolConfig(),
        adminModule: service.isAdminModuleEnable(),
        entityRegistry: service.getEntityRegistry(),
        entityPresets: service.getDefaultEntityPresets(),
        autoCreateSchemas: service.isAutoCreateSchemasEnabled(),
        allOptions: service.getAllOptions(),
      };

      const secondCall = {
        database: service.getDatabaseConfig(),
        tenantResolution: service.getTenantResolutionConfig(),
        connectionPool: service.getConnectionPoolConfig(),
        adminModule: service.isAdminModuleEnable(),
        entityRegistry: service.getEntityRegistry(),
        entityPresets: service.getDefaultEntityPresets(),
        autoCreateSchemas: service.isAutoCreateSchemasEnabled(),
        allOptions: service.getAllOptions(),
      };

      expect(firstCall).toEqual(secondCall);
    });
  });
});
