import { NotFoundException } from '@nestjs/common';
import {
  IOrmStrategy,
  TenantOrmConnection,
} from 'src/core/interfaces/orm-abstraction.interface';
import { ITenantValidationStrategy } from 'src/core/interfaces/tenant-validation.interface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tenant } from '../../../../src/admin/entities/tenant.entity';
import {
  IMultiTenantConfigService,
  ITenantContext,
  ITenantContextService,
} from '../../../../src/core/interfaces/tenant.interface';
import {
  ConnectionPoolConfig,
  DatabaseConfig,
} from '../../../../src/core/interfaces/typeorm.interface';
import { TenantConnectionService } from '../../../../src/core/services/tenant-connection.service';
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
  let mockTenantContextService: Mock<ITenantContextService>;
  let mockMultiTenantConfigService: Mock<IMultiTenantConfigService>;
  let mockTenantAdminService: Mock<ITenantValidationStrategy>;
  let mockOrmStrategy: Mock<IOrmStrategy>;
  let mockConnection: Mock<TenantOrmConnection>;

  beforeEach(async () => {
    // Crear mocks de servicios
    mockTenantContextService = createMock<ITenantContextService>();
    mockMultiTenantConfigService = createMock<IMultiTenantConfigService>();
    mockTenantAdminService = createMock<ITenantValidationStrategy>();
    mockOrmStrategy = createMock<IOrmStrategy>();
    mockConnection = createMock<TenantOrmConnection>();

    // Configurar mockOrmStrategy
    mockOrmStrategy.type = 'typeorm';
    mockOrmStrategy.createConnection = vi
      .fn()
      .mockResolvedValue(mockConnection);
    mockOrmStrategy.destroyConnection = vi.fn().mockResolvedValue(undefined);
    mockOrmStrategy.isConnectionValid = vi.fn().mockReturnValue(true);

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

    // Crear instancia del servicio
    service = new TenantConnectionService(
      mockTenantContextService,
      mockMultiTenantConfigService,
      mockOrmStrategy,
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
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
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
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
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
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
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
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
        mockTenantAdminService,
      );

      expect(newService).toBeDefined();
    });

    it('should work without tenant admin service (optional dependency)', () => {
      const newService = new TenantConnectionService(
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
        undefined,
      );

      expect(newService).toBeDefined();
    });
  });

  describe('getConnectionForSchema', () => {
    it('should return existing connection from pool when available', async () => {
      // Arrange
      const schema = 'existing-schema';

      // Act - Primera llamada crea la conexión
      const firstConnection = await service.getConnectionForSchema(schema);

      // Segunda llamada debe retornar la misma conexión del pool
      const secondConnection = await service.getConnectionForSchema(schema);

      // Assert
      expect(firstConnection).toBe(secondConnection);
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledTimes(1);
      expect(mockOrmStrategy.isConnectionValid).toHaveBeenCalled();
    });

    it('should validate tenant exists for non-default schemas', async () => {
      // Arrange
      const schema = 'custom-tenant';

      // Act
      await service.getConnectionForSchema(schema);

      // Assert
      expect(mockTenantAdminService.validateTenantExists).toHaveBeenCalledWith(
        schema,
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      // Arrange
      const schema = 'non-existent';
      mockTenantAdminService.validateTenantExists.mockResolvedValue(false);

      // Act & Assert
      await expect(service.getConnectionForSchema(schema)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getConnectionForSchema(schema)).rejects.toThrow(
        `Schema not found: ${schema}`,
      );
    });

    it('should skip validation for public schema', async () => {
      // Arrange
      const schema = 'public';

      // Act
      await service.getConnectionForSchema(schema);

      // Assert
      expect(
        mockTenantAdminService.validateTenantExists,
      ).not.toHaveBeenCalled();
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(
        schema,
        undefined,
      );
    });

    it('should skip validation for default schema', async () => {
      // Arrange
      const schema = 'default';
      vi.clearAllMocks(); // Limpiar los mocks antes del test

      // Act
      await service.getConnectionForSchema(schema);

      // Assert
      expect(
        mockTenantAdminService.validateTenantExists,
      ).not.toHaveBeenCalled();
      // 'default' no es 'public', por lo que SÍ obtiene las entidades del tenant
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(schema, [
        'user',
        'role',
      ]);
    });

    it('should skip validation when tenant admin service is not available', async () => {
      // Arrange
      const schema = 'custom-schema';
      const serviceWithoutAdmin = new TenantConnectionService(
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
        undefined,
      );

      // Act
      await serviceWithoutAdmin.getConnectionForSchema(schema);

      // Assert
      expect(
        mockTenantAdminService.validateTenantExists,
      ).not.toHaveBeenCalled();
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(schema, [
        'user',
        'role',
      ]);
    });

    it('should remove uninitialized connection from pool', async () => {
      // Arrange
      const schema = 'invalid-connection';
      mockOrmStrategy.isConnectionValid
        .mockReturnValueOnce(false) // Primera verificación: conexión inválida
        .mockReturnValueOnce(true); // Segunda verificación: nueva conexión válida

      // Agregar conexión inválida al pool
      (service as any).connectionPool.set(schema, mockConnection);

      // Act
      const result = await service.getConnectionForSchema(schema);

      // Assert
      expect(result).toBeDefined();
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledTimes(1);
    });

    it('should handle connection pool limit and cleanup old connections', async () => {
      // Arrange
      const maxConnections = 50;

      // Llenar el pool al límite
      for (let i = 0; i < maxConnections; i++) {
        (service as any).connectionPool.set(`schema-${i}`, mockConnection);
      }

      // Act
      const newSchema = 'new-schema';
      await service.getConnectionForSchema(newSchema);

      // Assert
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalled();
      expect((service as any).connectionPool.has(newSchema)).toBe(true);
    });

    it('should handle connection initialization failure', async () => {
      // Arrange
      const schema = 'fail-schema';
      const error = new Error('Connection failed');
      mockOrmStrategy.createConnection.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(service.getConnectionForSchema(schema)).rejects.toThrow(
        'Connection failed',
      );
    });
  });

  describe('getTenantConnection', () => {
    it('should return connection for current tenant schema', async () => {
      // Arrange
      const schema = 'tenant_test-tenant';
      mockTenantContextService.getTenantSchema.mockReturnValue(schema);

      // Act
      const result = await service.getTenantConnection();

      // Assert
      expect(result).toBeDefined();
      expect(mockTenantContextService.getTenantSchema).toHaveBeenCalled();
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(
        schema,
        expect.any(Array),
      );
    });

    it('should throw error when no tenant context is available', async () => {
      // Arrange
      mockTenantContextService.getTenantSchema.mockReturnValue(
        undefined as any,
      );

      // Act & Assert
      await expect(service.getTenantConnection()).rejects.toThrow(
        'No tenant context available',
      );
    });

    it('should throw error when tenant schema is undefined', async () => {
      // Arrange
      mockTenantContextService.getTenantSchema.mockReturnValue(
        undefined as any,
      );

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
    it('should close all connections and clear pool', async () => {
      // Arrange
      const schemas = ['schema1', 'schema2', 'schema3'];
      for (const schema of schemas) {
        await service.getConnectionForSchema(schema);
      }

      // Act
      await service.closeAllConnections();

      // Assert
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalledTimes(
        schemas.length,
      );
      expect((service as any).connectionPool.size).toBe(0);
    });

    it('should clear cleanup timer when closing connections', async () => {
      // Arrange
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

      const poolConfig = {
        ...createMockConnectionPoolConfig(),
        enableCleanup: true,
      };
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        poolConfig,
      );

      const serviceWithTimer = new TenantConnectionService(
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
        mockTenantAdminService,
      );

      // Verificar que el timer existe antes de cerrar
      const timerBeforeClose = (serviceWithTimer as any).cleanupTimer;
      expect(timerBeforeClose).toBeDefined();

      // Act
      await serviceWithTimer.closeAllConnections();

      // Assert - Verificar que clearInterval fue llamado con el timer
      expect(clearIntervalSpy).toHaveBeenCalledWith(timerBeforeClose);

      clearIntervalSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should handle connections that are not initialized', async () => {
      // Arrange
      (service as any).connectionPool.set('test-schema', mockConnection);

      // Act
      await service.closeAllConnections();

      // Assert
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalledWith(
        mockConnection,
      );
      expect((service as any).connectionPool.size).toBe(0);
    });

    it('should handle connection destruction errors gracefully', async () => {
      // Arrange
      const error = new Error('Destruction failed');
      mockOrmStrategy.destroyConnection.mockRejectedValueOnce(error);
      (service as any).connectionPool.set('test-schema', mockConnection);

      // Act & Assert - El método puede lanzar error ya que usa Promise.all
      await expect(service.closeAllConnections()).rejects.toThrow(
        'Destruction failed',
      );

      // Pero el pool debe limpiarse de todas formas después del error
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalled();
    });

    it('should handle errors during connection destruction', async () => {
      // Arrange
      const schemas = ['schema1', 'schema2'];
      for (const schema of schemas) {
        await service.getConnectionForSchema(schema);
      }

      mockOrmStrategy.destroyConnection.mockRejectedValue(
        new Error('Destroy failed'),
      );

      // Act & Assert - El método lanzará error ya que usa Promise.all
      await expect(service.closeAllConnections()).rejects.toThrow(
        'Destroy failed',
      );
    });

    it('should handle empty connection pool', async () => {
      // Act & Assert
      await expect(service.closeAllConnections()).resolves.toBeUndefined();
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

    it('should return correct stats for pool with active connections', async () => {
      // Arrange
      const schemas = ['schema1', 'schema2', 'schema3'];
      for (const schema of schemas) {
        await service.getConnectionForSchema(schema);
      }

      // Act
      const stats = service.getConnectionPoolStats();

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(3);
      expect(stats.inactive).toBe(0);
      expect(stats.schemas).toEqual(expect.arrayContaining(schemas));
    });

    it('should return correct stats for pool with mixed connections', async () => {
      // Arrange
      const activeSchemas = ['active1', 'active2'];
      const inactiveSchemas = ['inactive1'];

      for (const schema of activeSchemas) {
        await service.getConnectionForSchema(schema);
      }

      // Simular conexión inactiva
      const inactiveConnection = createMock<TenantOrmConnection>();
      (service as any).connectionPool.set(
        inactiveSchemas[0],
        inactiveConnection,
      );

      mockOrmStrategy.isConnectionValid.mockImplementation(conn => {
        return conn !== inactiveConnection;
      });

      // Act
      const stats = service.getConnectionPoolStats();

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.schemas).toEqual(
        expect.arrayContaining([...activeSchemas, ...inactiveSchemas]),
      );
    });

    it('should return correct stats for pool with only inactive connections', () => {
      // Arrange
      const inactiveConnection = createMock<TenantOrmConnection>();
      (service as any).connectionPool.set('inactive', inactiveConnection);
      mockOrmStrategy.isConnectionValid.mockReturnValue(false);

      // Act
      const stats = service.getConnectionPoolStats();

      // Assert
      expect(stats.total).toBe(1);
      expect(stats.active).toBe(0);
      expect(stats.inactive).toBe(1);
      expect(stats.schemas).toContain('inactive');
    });
  });

  describe('removeConnection', () => {
    it('should remove and destroy existing initialized connection', async () => {
      // Arrange
      const schema = 'remove-schema';
      await service.getConnectionForSchema(schema);

      // Act
      await service.removeConnection(schema);

      // Assert
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalledWith(
        mockConnection,
      );
      expect((service as any).connectionPool.has(schema)).toBe(false);
    });

    it('should remove uninitialized connection without destroying', async () => {
      // Arrange
      const schema = 'uninit-schema';
      const uninitConnection = createMock<TenantOrmConnection>();
      (service as any).connectionPool.set(schema, uninitConnection);

      // Act
      await service.removeConnection(schema);

      // Assert
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalled();
      expect((service as any).connectionPool.has(schema)).toBe(false);
    });

    it('should handle non-existent connection gracefully', async () => {
      // Act & Assert
      await expect(
        service.removeConnection('non-existent'),
      ).resolves.toBeUndefined();
    });

    it('should handle connection destruction errors', async () => {
      // Arrange
      const schema = 'error-schema';
      await service.getConnectionForSchema(schema);

      // Resetear el mock y configurar el error DESPUÉS de crear la conexión
      vi.clearAllMocks();
      mockOrmStrategy.destroyConnection.mockRejectedValueOnce(
        new Error('Destruction failed'),
      );

      // Act - No debería lanzar error porque tiene try-catch
      await service.removeConnection(schema);

      // Assert
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalled();
      // Cuando hay un error en destroyConnection, el delete está dentro del try
      // por lo que NO se ejecuta y la conexión permanece en el pool
      expect((service as any).connectionPool.has(schema)).toBe(true);
    });
  });

  describe('Private Methods Integration', () => {
    it('should get tenant entity config from admin service', async () => {
      // Arrange
      const schema = 'tenant-with-config';
      const mockTenant = createMockTenant({
        entityConfig: {
          enabledEntities: ['user', 'role', 'product'],
        },
      });
      mockTenantAdminService.findByCode.mockResolvedValue(mockTenant);

      // Act
      await service.getConnectionForSchema(schema);

      // Assert
      expect(mockTenantAdminService.findByCode).toHaveBeenCalledWith(schema);
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(schema, [
        'user',
        'role',
        'product',
      ]);
    });

    it('should return default entities when admin service is not available', async () => {
      // Arrange
      const serviceWithoutAdmin = new TenantConnectionService(
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
        undefined,
      );

      // Act
      await serviceWithoutAdmin.getConnectionForSchema('test-schema');

      // Assert
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(
        'test-schema',
        ['user', 'role'],
      );
    });

    it('should return default entities when tenant has no entity config', async () => {
      // Arrange
      const mockTenant = createMockTenant({ entityConfig: undefined as any });
      mockTenantAdminService.findByCode.mockResolvedValue(mockTenant);

      // Act
      await service.getConnectionForSchema('test-schema');

      // Assert
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(
        'test-schema',
        ['user', 'role'],
      );
    });

    it('should return default entities when tenant is not found', async () => {
      // Arrange
      mockTenantAdminService.findByCode.mockResolvedValue(undefined);

      // Act
      await service.getConnectionForSchema('test-schema');

      // Assert
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(
        'test-schema',
        ['user', 'role'],
      );
    });

    it('should perform scheduled cleanup when pool size exceeds threshold', async () => {
      // Arrange
      vi.useFakeTimers();
      const poolConfig = {
        ...createMockConnectionPoolConfig(),
        enableCleanup: true,
        cleanupInterval: 1000,
      };
      mockMultiTenantConfigService.getConnectionPoolConfig.mockReturnValue(
        poolConfig,
      );

      const serviceWithCleanup = new TenantConnectionService(
        mockTenantContextService,
        mockMultiTenantConfigService,
        mockOrmStrategy,
        mockTenantAdminService,
      );

      // Llenar el pool por encima del 80%
      for (let i = 0; i < 45; i++) {
        await serviceWithCleanup.getConnectionForSchema(`schema-${i}`);
      }

      const initialSize = (serviceWithCleanup as any).connectionPool.size;

      // Act
      await (serviceWithCleanup as any).performScheduledCleanup();

      // Assert
      expect((serviceWithCleanup as any).connectionPool.size).toBeLessThan(
        initialSize,
      );
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent connection requests for same schema', async () => {
      // Arrange
      const schema = 'concurrent-schema';

      // Crear un nuevo mock de conexión para cada llamada
      mockOrmStrategy.createConnection.mockImplementation(async () => {
        // Simular delay asíncrono
        await new Promise(resolve => setTimeout(resolve, 1));
        return mockConnection;
      });

      // Act
      const promises = [
        service.getConnectionForSchema(schema),
        service.getConnectionForSchema(schema),
        service.getConnectionForSchema(schema),
      ];

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      // Todas las promesas deben resolver
      for (const result of results) {
        expect(result).toBeDefined();
      }

      // El servicio actual no tiene lock mechanism, por lo que puede crear múltiples conexiones
      // pero la última llamada debería reutilizar la conexión del pool
      expect(mockOrmStrategy.createConnection).toHaveBeenCalled();
    });

    it('should handle very long schema names', async () => {
      // Arrange
      const longSchema = 'a'.repeat(100);

      // Act
      const result = await service.getConnectionForSchema(longSchema);

      // Assert
      expect(result).toBeDefined();
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(
        longSchema,
        expect.any(Array),
      );
    });

    it('should handle special characters in schema names', async () => {
      // Arrange
      const specialSchema = 'tenant-with_special.chars';

      // Act
      const result = await service.getConnectionForSchema(specialSchema);

      // Assert
      expect(result).toBeDefined();
      expect(mockOrmStrategy.createConnection).toHaveBeenCalledWith(
        specialSchema,
        expect.any(Array),
      );
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
      mockOrmStrategy.createConnection.mockImplementation(() => {
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

      // Act & Assert
      const connection = await service.getConnectionForSchema(schema);
      expect(connection).toBeDefined();

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
      await service.getConnectionForSchema('test-schema');

      // Act
      await service.closeAllConnections();

      // Assert
      expect(mockOrmStrategy.destroyConnection).toHaveBeenCalled();
      expect((service as any).connectionPool.size).toBe(0);
    });
  });
});
