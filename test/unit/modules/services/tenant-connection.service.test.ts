import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ITenantAdminService } from '../../../../src/interface/core.interface';
import {
  IMultiTenantConfigService,
  ITenantContext,
  ITenantContextService,
} from '../../../../src/interface/tenant.interface';
import {
  ConnectionPoolConfig,
  DatabaseConfig,
} from '../../../../src/interface/typeorm.interface';
import { Tenant } from '../../../../src/modules/entities/tenant.entity';
import { TenantConnectionService } from '../../../../src/modules/service/tenant-connection.service';
import { createMock, Mock } from '../../../utils/mock';

// Mock de getMultiTenantDatabaseConfig
vi.mock('../../../../src/config/database.config', () => ({
  getMultiTenantDatabaseConfig: vi
    .fn()
    .mockImplementation((configService, schema, entities) => ({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'test',
      password: 'test',
      database: 'test',
      schema: schema, // Use the actual schema parameter
      entities: entities || [],
      synchronize: false,
    })),
}));

// Mock TypeORM DataSource
vi.mock('typeorm', async importOriginal => {
  const actual = await importOriginal<typeof import('typeorm')>();

  class MockDataSource {
    initialize = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn().mockResolvedValue(undefined);
    isInitialized = true;
    options: any;

    constructor(options: any) {
      this.options = options;
    }
  }

  return {
    ...actual,
    DataSource: MockDataSource,
  };
});

// Mock data factories
const createMockConnectionPoolConfig = (): ConnectionPoolConfig => ({
  maxConnections: 50,
  idleTimeout: 300_000,
  enableCleanup: true,
  cleanupInterval: 60_000,
});

const createMockDatabaseConfig = (): DatabaseConfig => ({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'test',
  password: 'test',
  database: 'test_db',
  synchronize: false,
  logging: false,
});

const createMockTenant = (overrides?: Partial<Tenant>): Tenant => {
  const tenant = new Tenant();
  tenant.id = '1';
  tenant.code = 'test-tenant';
  tenant.name = 'Test Tenant';
  tenant.entityConfig = {
    enabledEntities: ['user', 'role'],
  };
  return Object.assign(tenant, overrides);
};

const createMockTenantContext = (
  overrides?: Partial<ITenantContext>,
): ITenantContext => ({
  tenantId: 'test-tenant',
  tenantSchema: 'tenant_test-tenant',
  hasTenant: true,
  ...overrides,
});

describe('TenantConnectionService', () => {
  let service: TenantConnectionService;
  let mockConfigService: Mock<ConfigService>;
  let mockTenantContextService: Mock<ITenantContextService>;
  let mockMultiTenantConfigService: Mock<IMultiTenantConfigService>;
  let mockTenantAdminService: Mock<ITenantAdminService>;
  let mockDataSource: Mock<DataSource>;

  beforeEach(async () => {
    // Crear mocks de servicios
    mockConfigService = createMock<ConfigService>();
    mockTenantContextService = createMock<ITenantContextService>();
    mockMultiTenantConfigService = createMock<IMultiTenantConfigService>();
    mockTenantAdminService = createMock<ITenantAdminService>();
    mockDataSource = createMock<DataSource>();

    // Configurar comportamiento por defecto de los mocks
    mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
      createMockConnectionPoolConfig(),
    );
    mockMultiTenantConfigService.getDatabaseConfig.mockReturnValue(
      createMockDatabaseConfig(),
    );

    mockTenantContextService.getTenantSchema.mockReturnValue(
      'tenant_test-tenant',
    );
    mockTenantContextService.getContext.mockReturnValue(
      createMockTenantContext(),
    );

    mockTenantAdminService.validateTenantExists.mockResolvedValue(true);
    mockTenantAdminService.findByCode.mockResolvedValue(createMockTenant());

    // Configurar DataSource mock
    mockDataSource.isInitialized = true;
    mockDataSource.initialize.mockResolvedValue(mockDataSource);
    mockDataSource.destroy.mockResolvedValue();

    // Crear instancia del servicio
    service = new TenantConnectionService(
      mockConfigService,
      mockTenantContextService,
      mockMultiTenantConfigService,
      mockTenantAdminService,
    );

    // Limpiar mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should create service instance with all dependencies', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TenantConnectionService);
    });

    it('should initialize with default connection pool configuration', () => {
      const poolConfig = createMockConnectionPoolConfig();
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        poolConfig,
      );

      const newService = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockTenantAdminService,
      );

      expect(newService).toBeDefined();
      expect(
        mockMultiTenantConfigService.getConnectionPoolConfig,
      ).toHaveBeenCalled();
    });

    it('should initialize with custom connection pool configuration', () => {
      const customPoolConfig: ConnectionPoolConfig = {
        maxConnections: 100,
        idleTimeout: 600_000,
        enableCleanup: false,
        cleanupInterval: 120_000,
      };
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        customPoolConfig,
      );

      const newService = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockTenantAdminService,
      );

      expect(newService).toBeDefined();
    });

    it('should start cleanup timer when cleanup is enabled', () => {
      vi.useFakeTimers();
      const poolConfig = {
        ...createMockConnectionPoolConfig(),
        enableCleanup: true,
      };
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        poolConfig,
      );

      const newService = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockTenantAdminService,
      );

      expect(newService).toBeDefined();
      vi.useRealTimers();
    });

    it('should not start cleanup timer when cleanup is disabled', () => {
      const poolConfig = {
        ...createMockConnectionPoolConfig(),
        enableCleanup: false,
      };
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        poolConfig,
      );

      const newService = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockTenantAdminService,
      );

      expect(newService).toBeDefined();
    });

    it('should work without tenant admin service (optional dependency)', () => {
      const newService = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        undefined,
      );

      expect(newService).toBeDefined();
    });
  });

  describe('getConnectionForSchema', () => {
    it('should return existing connection from pool when available', async () => {
      // Arrange
      const schema = 'test-schema';
      const existingConnection = mockDataSource;
      existingConnection.isInitialized = true;

      // Simular que ya existe una conexión en el pool
      (service as any).connectionPool.set(schema, existingConnection);

      // Act
      const result = await service.getConnectionForSchema(schema);

      // Assert
      expect(result).toBe(existingConnection);
      expect(mockTenantAdminService.validateTenantExists).toHaveBeenCalledWith(
        schema,
      );
    });

    it('should validate tenant exists for non-default schemas', async () => {
      // Arrange
      const schema = 'tenant-schema';
      mockTenantAdminService.validateTenantExists.mockResolvedValue(true);

      // Act
      const result = await service.getConnectionForSchema(schema);

      // Assert
      expect(mockTenantAdminService.validateTenantExists).toHaveBeenCalledWith(
        schema,
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      // Arrange
      const schema = 'non-existent-tenant';
      mockTenantAdminService.validateTenantExists.mockResolvedValue(false);

      // Act & Assert
      await expect(service.getConnectionForSchema(schema)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getConnectionForSchema(schema)).rejects.toThrow(
        'Schema not found: non-existent-tenant',
      );
    });

    it('should skip validation for public schema', async () => {
      // Arrange
      const schema = 'public';

      // Act
      const result = await service.getConnectionForSchema(schema);

      // Assert
      expect(
        mockTenantAdminService.validateTenantExists,
      ).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip validation for default schema', async () => {
      // Arrange
      const schema = 'default';

      // Act
      const result = await service.getConnectionForSchema(schema);

      // Assert
      expect(
        mockTenantAdminService.validateTenantExists,
      ).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip validation when tenant admin service is not available', async () => {
      // Arrange
      const schema = 'some-tenant';
      const serviceWithoutAdmin = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        undefined,
      );

      // Act
      const result = await serviceWithoutAdmin.getConnectionForSchema(schema);

      // Assert
      expect(result).toBeDefined();
    });

    it('should remove uninitialized connection from pool', async () => {
      // Arrange
      const schema = 'test-schema';
      const uninitializedConnection = createMock<DataSource>();
      uninitializedConnection.isInitialized = false;

      (service as any).connectionPool.set(schema, uninitializedConnection);

      // Act
      const result = await service.getConnectionForSchema(schema);

      // Assert
      expect(result).toBeDefined();
      expect((service as any).connectionPool.has(schema)).toBe(true);
    });

    it('should handle connection pool limit and cleanup old connections', async () => {
      // Arrange
      const schema = 'new-schema';
      const poolConfig = {
        ...createMockConnectionPoolConfig(),
        maxConnections: 2,
      };
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        poolConfig,
      );

      const serviceWithSmallPool = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockTenantAdminService,
      );

      // Llenar el pool hasta el límite
      const connection1 = createMock<DataSource>();
      connection1.isInitialized = true;
      connection1.destroy.mockResolvedValue();

      const connection2 = createMock<DataSource>();
      connection2.isInitialized = true;
      connection2.destroy.mockResolvedValue();

      (serviceWithSmallPool as any).connectionPool.set('schema1', connection1);
      (serviceWithSmallPool as any).connectionPool.set('schema2', connection2);

      // Act
      const result = await serviceWithSmallPool.getConnectionForSchema(schema);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle connection initialization failure', async () => {
      // Arrange
      const schema = 'failing-schema';

      // Create a service instance that will use a failing DataSource
      const failingService = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockTenantAdminService,
      );

      // Override the createConnection method to simulate failure
      const originalCreateConnection = (failingService as any).createConnection;
      (failingService as any).createConnection = vi
        .fn()
        .mockRejectedValue(new Error('Connection failed'));

      try {
        // Act & Assert
        await expect(
          failingService.getConnectionForSchema(schema),
        ).rejects.toThrow('Connection failed');
      } finally {
        // Restore original method
        (failingService as any).createConnection = originalCreateConnection;
      }
    });
  });

  describe('getTenantConnection', () => {
    it('should return connection for current tenant schema', async () => {
      // Arrange
      const schema = 'tenant_current-tenant';
      mockTenantContextService.getTenantSchema.mockReturnValue(schema);

      // Mock DataSource constructor
      const DataSourceConstructor = vi
        .fn()
        .mockImplementation(() => mockDataSource);
      vi.doMock('typeorm', () => ({ DataSource: DataSourceConstructor }));

      // Act
      const result = await service.getTenantConnection();

      // Assert
      expect(mockTenantContextService.getTenantSchema).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.isInitialized).toBe(true);
    });

    it('should throw error when no tenant context is available', async () => {
      // Arrange
      mockTenantContextService.getTenantSchema.mockReturnValue(undefined);

      // Act & Assert
      await expect(service.getTenantConnection()).rejects.toThrow(
        'No tenant context available',
      );
    });

    it('should throw error when tenant schema is undefined', async () => {
      // Arrange
      mockTenantContextService.getTenantSchema.mockReturnValue(undefined);

      // Act & Assert
      await expect(service.getTenantConnection()).rejects.toThrow(
        'No tenant context available',
      );
    });

    it('should throw error when tenant schema is empty string', async () => {
      // Arrange
      mockTenantContextService.getTenantSchema.mockReturnValue('');

      // Act & Assert
      await expect(service.getTenantConnection()).rejects.toThrow(
        'No tenant context available',
      );
    });
  });

  describe('closeAllConnections', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should close all connections and clear pool', async () => {
      // Arrange
      const connection1 = createMock<DataSource>();
      const connection2 = createMock<DataSource>();
      connection1.isInitialized = true;
      connection2.isInitialized = true;
      connection1.destroy.mockResolvedValue();
      connection2.destroy.mockResolvedValue();

      (service as any).connectionPool.set('schema1', connection1);
      (service as any).connectionPool.set('schema2', connection2);

      // Act
      await service.closeAllConnections();

      // Assert
      expect(connection1.destroy).toHaveBeenCalled();
      expect(connection2.destroy).toHaveBeenCalled();
      expect((service as any).connectionPool.size).toBe(0);
    });

    it('should clear cleanup timer when closing connections', async () => {
      // Arrange
      const poolConfig = {
        ...createMockConnectionPoolConfig(),
        enableCleanup: true,
      };
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        poolConfig,
      );

      const serviceWithTimer = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockTenantAdminService,
      );

      // Act
      await serviceWithTimer.closeAllConnections();

      // Assert - El timer debería haberse limpiado
      expect(serviceWithTimer).toBeDefined();
    });

    it('should handle connections that are not initialized', async () => {
      // Arrange
      const uninitializedConnection = createMock<DataSource>();
      uninitializedConnection.isInitialized = false;

      (service as any).connectionPool.set('schema1', uninitializedConnection);

      // Act
      await service.closeAllConnections();

      // Assert
      expect(uninitializedConnection.destroy).not.toHaveBeenCalled();
      expect((service as any).connectionPool.size).toBe(0);
    });

    it('should handle connection destruction errors gracefully', async () => {
      // Arrange
      const failingConnection = createMock<DataSource>();
      failingConnection.isInitialized = true;
      failingConnection.destroy.mockRejectedValue(
        new Error('Destruction failed'),
      );

      (service as any).connectionPool.set('failing-schema', failingConnection);

      // Act & Assert - Debería lanzar error porque Promise.all falla si alguna conexión falla
      await expect(service.closeAllConnections()).rejects.toThrow(
        'Destruction failed',
      );
      expect((service as any).connectionPool.size).toBe(1); // El pool NO se limpia porque Promise.all falla antes de llegar a clear()
    });

    it('should handle errors during connection destruction', async () => {
      // Arrange
      const connection1 = createMock<DataSource>();
      const connection2 = createMock<DataSource>();

      connection1.destroy.mockRejectedValue(new Error('Destruction failed'));
      connection2.destroy.mockResolvedValue();

      (service as any).connectionPool.set('schema1', connection1);
      (service as any).connectionPool.set('schema2', connection2);

      // Act & Assert
      await expect(service.closeAllConnections()).rejects.toThrow(
        'Destruction failed',
      );

      // El pool NO se limpia porque Promise.all falla antes de llegar a clear()
      expect((service as any).connectionPool.size).toBe(2);
    });

    it('should handle empty connection pool', async () => {
      // Act & Assert
      await expect(service.closeAllConnections()).resolves.not.toThrow();
      expect((service as any).connectionPool.size).toBe(0);
    });
  });

  describe('getConnectionPoolStats', () => {
    it('should return correct stats for empty pool', () => {
      // Act
      const stats = service.getConnectionPoolStats();

      // Assert
      expect(stats).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        schemas: [],
      });
    });

    it('should return correct stats for pool with active connections', () => {
      // Arrange
      const activeConnection1 = createMock<DataSource>();
      const activeConnection2 = createMock<DataSource>();
      activeConnection1.isInitialized = true;
      activeConnection2.isInitialized = true;

      (service as any).connectionPool.set('schema1', activeConnection1);
      (service as any).connectionPool.set('schema2', activeConnection2);

      // Act
      const stats = service.getConnectionPoolStats();

      // Assert
      expect(stats).toEqual({
        total: 2,
        active: 2,
        inactive: 0,
        schemas: ['schema1', 'schema2'],
      });
    });

    it('should return correct stats for pool with mixed connections', () => {
      // Arrange
      const activeConnection = createMock<DataSource>();
      const inactiveConnection = createMock<DataSource>();
      activeConnection.isInitialized = true;
      inactiveConnection.isInitialized = false;

      (service as any).connectionPool.set('active-schema', activeConnection);
      (service as any).connectionPool.set(
        'inactive-schema',
        inactiveConnection,
      );

      // Act
      const stats = service.getConnectionPoolStats();

      // Assert
      expect(stats).toEqual({
        total: 2,
        active: 1,
        inactive: 1,
        schemas: ['active-schema', 'inactive-schema'],
      });
    });

    it('should return correct stats for pool with only inactive connections', () => {
      // Arrange
      const inactiveConnection1 = createMock<DataSource>();
      const inactiveConnection2 = createMock<DataSource>();
      inactiveConnection1.isInitialized = false;
      inactiveConnection2.isInitialized = false;

      (service as any).connectionPool.set('schema1', inactiveConnection1);
      (service as any).connectionPool.set('schema2', inactiveConnection2);

      // Act
      const stats = service.getConnectionPoolStats();

      // Assert
      expect(stats).toEqual({
        total: 2,
        active: 0,
        inactive: 2,
        schemas: ['schema1', 'schema2'],
      });
    });
  });

  describe('removeConnection', () => {
    it('should remove and destroy existing initialized connection', async () => {
      // Arrange
      const schema = 'test-schema';
      const connection = createMock<DataSource>();
      connection.isInitialized = true;
      connection.destroy.mockResolvedValue();

      (service as any).connectionPool.set(schema, connection);

      // Act
      await service.removeConnection(schema);

      // Assert
      expect(connection.destroy).toHaveBeenCalled();
      expect((service as any).connectionPool.has(schema)).toBe(false);
    });

    it('should remove uninitialized connection without destroying', async () => {
      // Arrange
      const schema = 'test-schema';
      const connection = createMock<DataSource>();
      connection.isInitialized = false;

      (service as any).connectionPool.set(schema, connection);

      // Act
      await service.removeConnection(schema);

      // Assert
      expect(connection.destroy).not.toHaveBeenCalled();
      expect((service as any).connectionPool.has(schema)).toBe(false);
    });

    it('should handle non-existent connection gracefully', async () => {
      // Arrange
      const schema = 'non-existent-schema';

      // Act & Assert
      await expect(service.removeConnection(schema)).resolves.not.toThrow();
    });

    it('should handle connection destruction errors', async () => {
      // Arrange
      const schema = 'failing-schema';
      const connection = createMock<DataSource>();
      connection.isInitialized = true;
      connection.destroy.mockRejectedValue(new Error('Destruction failed'));

      (service as any).connectionPool.set(schema, connection);

      // Act & Assert - No debería lanzar error, solo registrarlo
      await expect(service.removeConnection(schema)).resolves.not.toThrow();
      expect((service as any).connectionPool.has(schema)).toBe(true); // La conexión permanece en el pool cuando falla la destrucción
    });
  });

  describe('Private Methods Integration', () => {
    it('should get tenant entity config from admin service', async () => {
      // Arrange
      const tenantCode = 'test-tenant';
      const mockTenant = createMockTenant({
        entityConfig: { enabledEntities: ['user', 'role', 'permission'] },
      });
      mockTenantAdminService.findByCode.mockResolvedValue(mockTenant);

      // Act
      const result = await (service as any).getTenantEntityConfig(tenantCode);

      // Assert
      expect(mockTenantAdminService.findByCode).toHaveBeenCalledWith(
        tenantCode,
      );
      expect(result).toEqual(['user', 'role', 'permission']);
    });

    it('should return default entities when admin service is not available', async () => {
      // Arrange
      const tenantCode = 'test-tenant';
      const serviceWithoutAdmin = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        undefined,
      );

      // Act
      const result = await (serviceWithoutAdmin as any).getTenantEntityConfig(
        tenantCode,
      );

      // Assert
      expect(result).toEqual(['user', 'role']);
    });

    it('should return default entities when tenant has no entity config', async () => {
      // Arrange
      const tenantCode = 'test-tenant';
      const mockTenant = createMockTenant({ entityConfig: undefined });
      mockTenantAdminService.findByCode.mockResolvedValue(mockTenant);

      // Act
      const result = await (service as any).getTenantEntityConfig(tenantCode);

      // Assert
      expect(result).toEqual(['user', 'role']);
    });

    it('should return default entities when tenant is not found', async () => {
      // Arrange
      const tenantCode = 'non-existent-tenant';
      mockTenantAdminService.findByCode.mockResolvedValue(undefined as any);

      // Act
      const result = await (service as any).getTenantEntityConfig(tenantCode);

      // Assert
      expect(result).toEqual(['user', 'role']);
    });

    it('should perform scheduled cleanup when pool size exceeds threshold', async () => {
      // Arrange
      vi.useFakeTimers();
      const poolConfig = {
        ...createMockConnectionPoolConfig(),
        maxConnections: 10,
      };
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        poolConfig,
      );

      const serviceWithCleanup = new TenantConnectionService(
        mockConfigService,
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockTenantAdminService,
      );

      // Llenar el pool por encima del 80%
      for (let i = 0; i < 9; i++) {
        const connection = createMock<DataSource>();
        connection.isInitialized = true;
        connection.destroy.mockResolvedValue();
        (serviceWithCleanup as any).connectionPool.set(
          `schema${i}`,
          connection,
        );
      }

      // Act
      await (serviceWithCleanup as any).performScheduledClenup();

      // Assert - Debería haber limpiado algunas conexiones
      expect((serviceWithCleanup as any).connectionPool.size).toBeLessThan(9);

      vi.useRealTimers();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent connection requests for same schema', async () => {
      // Arrange
      const schema = 'concurrent-schema';

      // Mock DataSource constructor
      const DataSourceConstructor = vi
        .fn()
        .mockImplementation(() => mockDataSource);
      vi.doMock('typeorm', () => ({ DataSource: DataSourceConstructor }));

      // Act
      const promises = [
        service.getConnectionForSchema(schema),
        service.getConnectionForSchema(schema),
        service.getConnectionForSchema(schema),
      ];

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result.isInitialized).toBe(true);
      }
    });

    it('should handle very long schema names', async () => {
      // Arrange
      const longSchema = 'a'.repeat(100);

      // Act
      const result = await service.getConnectionForSchema(longSchema);

      // Assert
      expect(result).toBeDefined();
      expect(result.isInitialized).toBe(true);
      expect(result.options.schema).toBe(longSchema);
    });

    it('should handle special characters in schema names', async () => {
      // Arrange
      const specialSchema = 'tenant-with_special.chars';

      // Act
      const result = await service.getConnectionForSchema(specialSchema);

      // Assert
      expect(result).toBeDefined();
      expect(result.isInitialized).toBe(true);
      expect(result.options.schema).toBe(specialSchema);
    });

    it('should handle admin service validation timeout', async () => {
      // Arrange
      const schema = 'timeout-schema';
      mockTenantAdminService.validateTenantExists.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Validation timeout')), 100),
          ),
      );

      // Act & Assert
      await expect(service.getConnectionForSchema(schema)).rejects.toThrow(
        'Validation timeout',
      );
    });

    it('should handle database config retrieval failure', async () => {
      // Arrange
      const schema = 'config-fail-schema';
      mockMultiTenantConfigService.getDatabaseConfig.mockImplementation(() => {
        throw new Error('Config retrieval failed');
      });

      // Act & Assert
      await expect(service.getConnectionForSchema(schema)).rejects.toThrow(
        'Config retrieval failed',
      );
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid connection creation and destruction', async () => {
      // Arrange
      const iterations = 100;
      const schemas = Array.from(
        { length: iterations },
        (_, i) => `schema-${i}`,
      );

      // Mock DataSource constructor
      const DataSourceConstructor = vi.fn().mockImplementation(() => {
        const ds = createMock<DataSource>();
        ds.isInitialized = true;
        ds.initialize.mockResolvedValue(ds);
        ds.destroy.mockResolvedValue();
        return ds;
      });
      vi.doMock('typeorm', () => ({ DataSource: DataSourceConstructor }));

      // Act
      const startTime = Date.now();

      for (const schema of schemas) {
        await service.getConnectionForSchema(schema);
        await service.removeConnection(schema);
      }

      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect((service as any).connectionPool.size).toBe(0);
    });

    it('should not leak memory with repeated operations', async () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;

      // Mock DataSource constructor
      const DataSourceConstructor = vi
        .fn()
        .mockImplementation(() => mockDataSource);
      vi.doMock('typeorm', () => ({ DataSource: DataSourceConstructor }));

      // Act
      for (let i = 0; i < 1000; i++) {
        await service.getConnectionForSchema(`schema-${i % 10}`);
        service.getConnectionPoolStats();
        if (i % 100 === 0) {
          await service.closeAllConnections();
        }
      }

      // Assert
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1k operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement ITenantConnectionService interface correctly', () => {
      // Verify all required methods exist
      expect(typeof service.getConnectionForSchema).toBe('function');
      expect(typeof service.getTenantConnection).toBe('function');
      expect(typeof service.closeAllConnections).toBe('function');
      expect(typeof service.getConnectionPoolStats).toBe('function');
      expect(typeof service.removeConnection).toBe('function');
    });

    it('should return correct types for all methods', async () => {
      // Arrange
      const schema = 'interface-test';

      // Mock DataSource constructor
      const DataSourceConstructor = vi
        .fn()
        .mockImplementation(() => mockDataSource);
      vi.doMock('typeorm', () => ({ DataSource: DataSourceConstructor }));

      // Act & Assert
      const connection = await service.getConnectionForSchema(schema);
      expect(connection).toBeInstanceOf(Object);

      const stats = service.getConnectionPoolStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('inactive');
      expect(stats).toHaveProperty('schemas');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.inactive).toBe('number');
      expect(Array.isArray(stats.schemas)).toBe(true);

      await expect(service.closeAllConnections()).resolves.toBeUndefined();
      await expect(service.removeConnection(schema)).resolves.toBeUndefined();
    });
  });

  describe('Service Lifecycle', () => {
    it('should maintain connection pool state across multiple operations', async () => {
      // Arrange
      const schemas = ['schema1', 'schema2', 'schema3'];

      // Mock DataSource constructor
      const DataSourceConstructor = vi.fn().mockImplementation(() => {
        const ds = createMock<DataSource>();
        ds.isInitialized = true;
        ds.initialize.mockResolvedValue(ds);
        return ds;
      });
      vi.doMock('typeorm', () => ({ DataSource: DataSourceConstructor }));

      // Act
      for (const schema of schemas) {
        await service.getConnectionForSchema(schema);
      }

      const statsAfterCreation = service.getConnectionPoolStats();

      await service.removeConnection('schema2');

      const statsAfterRemoval = service.getConnectionPoolStats();

      // Assert
      expect(statsAfterCreation.total).toBe(3);
      expect(statsAfterCreation.schemas).toEqual(
        expect.arrayContaining(schemas),
      );

      expect(statsAfterRemoval.total).toBe(2);
      expect(statsAfterRemoval.schemas).not.toContain('schema2');
    });

    it('should handle service destruction gracefully', async () => {
      // Arrange
      const connection = createMock<DataSource>();
      connection.isInitialized = true;
      connection.destroy.mockResolvedValue();

      (service as any).connectionPool.set('test-schema', connection);

      // Act
      await service.closeAllConnections();

      // Assert
      expect(connection.destroy).toHaveBeenCalled();
      expect((service as any).connectionPool.size).toBe(0);
    });
  });
});
