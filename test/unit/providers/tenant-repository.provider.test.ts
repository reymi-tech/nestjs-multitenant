// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Provider } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ITenantConnectionService,
  ITenantContext,
  ITenantContextService,
} from '../../../src/interface/tenant.interface';
import { TENANT_CONNECTION_SERVICE } from '../../../src/modules/service/tenant-connection.service';
import { TENANT_CONTEXT_SERVICE } from '../../../src/modules/service/tenant-context.service';
import {
  createSpecificTenantRepositoryProvider,
  createTenantRepositoryFactory,
  createTenantRepositoryProvider,
  createTenantRepositoryProviders,
  TenantDataSourceProvider,
} from '../../../src/providers/tenant-repository.provider';
import {
  getTenantRepositoryToken,
  TOKEN_CONSTANTS,
} from '../../../src/utils/generate-token.provider';
import { createMock, Mock } from '../../utils/mock';

// Mock entities para las pruebas
class MockUserEntity {
  static name = 'User';
  id: string;
  name: string;
  email: string;
}

class MockOrderEntity {
  static name = 'Order';
  id: string;
  userId: string;
  total: number;
}

class MockProductEntity {
  static name = 'Product';
  id: string;
  name: string;
  price: number;
}

describe('tenant-repository.provider', () => {
  let mockTenantConnectionService: Mock<ITenantConnectionService>;
  let mockTenantContextService: Mock<ITenantContextService>;
  let mockDataSource: Mock<DataSource>;
  let mockRepository: Mock<Repository<any>>;

  const mockTenantContext: ITenantContext = {
    tenantId: 'test-tenant',
    tenantSchema: 'tenant_test-tenant',
    hasTenant: true,
  };

  beforeEach(() => {
    // Crear mocks de servicios
    mockTenantConnectionService = createMock<ITenantConnectionService>();
    mockTenantContextService = createMock<ITenantContextService>();
    mockDataSource = createMock<DataSource>();
    mockRepository = createMock<Repository<any>>();

    // Configurar comportamiento por defecto de los mocks
    mockTenantContextService.getContext.mockReturnValue(mockTenantContext);
    mockDataSource.getRepository.mockReturnValue(mockRepository);
    mockTenantConnectionService.getConnectionForSchema.mockResolvedValue(
      mockDataSource,
    );

    // Limpiar todos los mocks
    vi.clearAllMocks();
  });

  describe('createTenantRepositoryProvider', () => {
    it('debería crear un provider válido para una entidad', () => {
      // Arrange
      const entity = MockUserEntity;

      // Act
      const provider = createTenantRepositoryProvider(entity);

      // Assert
      expect(provider).toBeDefined();
      expect(provider.provide).toBe(getTenantRepositoryToken(entity));
      expect(provider.useFactory).toBeInstanceOf(Function);
      expect(provider.inject).toEqual([
        TENANT_CONNECTION_SERVICE,
        TENANT_CONTEXT_SERVICE,
      ]);
    });

    it('debería crear un provider para entidad tipo string', () => {
      // Arrange
      const entityName = 'StringEntity';

      // Act
      const provider = createTenantRepositoryProvider(entityName);

      // Assert
      expect(provider).toBeDefined();
      expect(provider.provide).toBe(`TENANT_REPOSITORY_${entityName}`);
      expect(provider.useFactory).toBeInstanceOf(Function);
    });

    describe('useFactory', () => {
      it('debería retornar un repositorio cuando el contexto del tenant es válido', async () => {
        // Arrange
        const entity = MockUserEntity;
        const provider = createTenantRepositoryProvider(entity);

        // Act
        const result = await provider.useFactory!(
          mockTenantConnectionService,
          mockTenantContextService,
        );

        // Assert
        expect(result).toBe(mockRepository);
        expect(mockTenantContextService.getContext).toHaveBeenCalledTimes(1);
        expect(
          mockTenantConnectionService.getConnectionForSchema,
        ).toHaveBeenCalledWith('tenant_test-tenant');
        expect(mockDataSource.getRepository).toHaveBeenCalledWith(entity);
      });

      it('debería lanzar error cuando no hay contexto de tenant', async () => {
        // Arrange
        const entity = MockUserEntity;
        const provider = createTenantRepositoryProvider(entity);
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: undefined,
          tenantSchema: undefined,
          hasTenant: false,
        });

        // Act & Assert
        await expect(
          provider.useFactory!(
            mockTenantConnectionService,
            mockTenantContextService,
          ),
        ).rejects.toThrow(
          'No tenant context available for repository creation',
        );
      });

      it('debería lanzar error cuando el contexto no tiene tenantSchema', async () => {
        // Arrange
        const entity = MockUserEntity;
        const provider = createTenantRepositoryProvider(entity);
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: 'test-tenant',
          tenantSchema: undefined,
          hasTenant: true,
        });

        // Act & Assert
        await expect(
          provider.useFactory!(
            mockTenantConnectionService,
            mockTenantContextService,
          ),
        ).rejects.toThrow(
          'No tenant context available for repository creation',
        );
      });

      it('debería manejar errores del servicio de conexión', async () => {
        // Arrange
        const entity = MockUserEntity;
        const provider = createTenantRepositoryProvider(entity);
        const connectionError = new Error('Connection failed');
        mockTenantConnectionService.getConnectionForSchema.mockRejectedValue(
          connectionError,
        );

        // Act & Assert
        await expect(
          provider.useFactory!(
            mockTenantConnectionService,
            mockTenantContextService,
          ),
        ).rejects.toThrow('Connection failed');
      });
    });
  });

  describe('createTenantRepositoryProviders', () => {
    it('debería crear múltiples providers para un array de entidades', () => {
      // Arrange
      const entities = [MockUserEntity, MockOrderEntity, MockProductEntity];

      // Act
      const providers = createTenantRepositoryProviders(entities);

      // Assert
      expect(providers).toHaveLength(3);
      expect(providers[0].provide).toBe('TENANT_REPOSITORY_User');
      expect(providers[1].provide).toBe('TENANT_REPOSITORY_Order');
      expect(providers[2].provide).toBe('TENANT_REPOSITORY_Product');

      for (const provider of providers) {
        expect(provider.useFactory).toBeInstanceOf(Function);
        expect(provider.inject).toEqual([
          TENANT_CONNECTION_SERVICE,
          TENANT_CONTEXT_SERVICE,
        ]);
      }
    });

    it('debería retornar array vacío para array de entidades vacío', () => {
      // Arrange
      const entities: EntityTarget<ObjectLiteral>[] = [];

      // Act
      const providers = createTenantRepositoryProviders(entities);

      // Assert
      expect(providers).toHaveLength(0);
      expect(Array.isArray(providers)).toBe(true);
    });

    it('debería manejar entidades mixtas (clases y strings)', () => {
      // Arrange
      const entities = [MockUserEntity, 'StringEntity', MockOrderEntity];

      // Act
      const providers = createTenantRepositoryProviders(entities);

      // Assert
      expect(providers).toHaveLength(3);
      expect(providers[0].provide).toBe('TENANT_REPOSITORY_User');
      expect(providers[1].provide).toBe('TENANT_REPOSITORY_StringEntity');
      expect(providers[2].provide).toBe('TENANT_REPOSITORY_Order');
    });
  });

  describe('TenantDataSourceProvider', () => {
    it('debería tener la configuración correcta del provider', () => {
      // Assert
      expect(TenantDataSourceProvider.provide).toBe(
        TOKEN_CONSTANTS.DATA_SOURCE,
      );
      expect(TenantDataSourceProvider.useFactory).toBeInstanceOf(Function);
      expect(TenantDataSourceProvider.inject).toEqual([
        TENANT_CONNECTION_SERVICE,
        TENANT_CONTEXT_SERVICE,
      ]);
    });

    describe('useFactory', () => {
      it('debería retornar un DataSource cuando el contexto del tenant es válido', async () => {
        // Act
        const result = await TenantDataSourceProvider.useFactory!(
          mockTenantConnectionService,
          mockTenantContextService,
        );

        // Assert
        expect(result).toBe(mockDataSource);
        expect(mockTenantContextService.getContext).toHaveBeenCalledTimes(1);
        expect(
          mockTenantConnectionService.getConnectionForSchema,
        ).toHaveBeenCalledWith('tenant_test-tenant');
      });

      it('debería lanzar error cuando no hay contexto de tenant', async () => {
        // Arrange
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: undefined,
          tenantSchema: undefined,
          hasTenant: false,
        });

        // Act & Assert
        await expect(
          TenantDataSourceProvider.useFactory!(
            mockTenantConnectionService,
            mockTenantContextService,
          ),
        ).rejects.toThrow(
          'No tenant context available for data source creation',
        );
      });

      it('debería lanzar error cuando el contexto no tiene tenantSchema', async () => {
        // Arrange
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: 'test-tenant',
          tenantSchema: undefined,
          hasTenant: true,
        });

        // Act & Assert
        await expect(
          TenantDataSourceProvider.useFactory!(
            mockTenantConnectionService,
            mockTenantContextService,
          ),
        ).rejects.toThrow(
          'No tenant context available for data source creation',
        );
      });

      it('debería manejar errores del servicio de conexión para DataSource', async () => {
        // Arrange
        const connectionError = new Error('DataSource connection failed');
        mockTenantConnectionService.getConnectionForSchema.mockRejectedValue(
          connectionError,
        );

        // Act & Assert
        await expect(
          TenantDataSourceProvider.useFactory!(
            mockTenantConnectionService,
            mockTenantContextService,
          ),
        ).rejects.toThrow('DataSource connection failed');
      });
    });
  });

  describe('createSpecificTenantRepositoryProvider', () => {
    it('debería crear un provider para un tenant específico', () => {
      // Arrange
      const entity = MockUserEntity;
      const tenantId = 'specific-tenant';

      // Act
      const provider = createSpecificTenantRepositoryProvider(entity, tenantId);

      // Assert
      expect(provider).toBeDefined();
      expect(provider.provide).toBe(`TENANT_REPOSITORY_User_${tenantId}`);
      expect(provider.useFactory).toBeInstanceOf(Function);
      expect(provider.inject).toEqual([TENANT_CONNECTION_SERVICE]);
    });

    it('debería crear provider con token único para diferentes tenants', () => {
      // Arrange
      const entity = MockUserEntity;
      const tenantId1 = 'tenant-1';
      const tenantId2 = 'tenant-2';

      // Act
      const provider1 = createSpecificTenantRepositoryProvider(
        entity,
        tenantId1,
      );
      const provider2 = createSpecificTenantRepositoryProvider(
        entity,
        tenantId2,
      );

      // Assert
      expect(provider1.provide).toBe('TENANT_REPOSITORY_User_tenant-1');
      expect(provider2.provide).toBe('TENANT_REPOSITORY_User_tenant-2');
      expect(provider1.provide).not.toBe(provider2.provide);
    });

    describe('useFactory', () => {
      it('debería retornar repositorio para tenant específico', async () => {
        // Arrange
        const entity = MockUserEntity;
        const tenantId = 'specific-tenant';
        const provider = createSpecificTenantRepositoryProvider(
          entity,
          tenantId,
        );

        // Act
        const result = await provider.useFactory!(mockTenantConnectionService);

        // Assert
        expect(result).toBe(mockRepository);
        expect(
          mockTenantConnectionService.getConnectionForSchema,
        ).toHaveBeenCalledWith(`tenant_${tenantId}`);
        expect(mockDataSource.getRepository).toHaveBeenCalledWith(entity);
      });

      it('debería manejar errores de conexión para tenant específico', async () => {
        // Arrange
        const entity = MockUserEntity;
        const tenantId = 'failing-tenant';
        const provider = createSpecificTenantRepositoryProvider(
          entity,
          tenantId,
        );
        const connectionError = new Error('Specific tenant connection failed');
        mockTenantConnectionService.getConnectionForSchema.mockRejectedValue(
          connectionError,
        );

        // Act & Assert
        await expect(
          provider.useFactory!(mockTenantConnectionService),
        ).rejects.toThrow('Specific tenant connection failed');
      });

      it('debería usar el formato correcto de schema para tenant específico', async () => {
        // Arrange
        const entity = MockOrderEntity;
        const tenantId = 'company-123';
        const provider = createSpecificTenantRepositoryProvider(
          entity,
          tenantId,
        );

        // Act
        await provider.useFactory!(mockTenantConnectionService);

        // Assert
        expect(
          mockTenantConnectionService.getConnectionForSchema,
        ).toHaveBeenCalledWith('tenant_company-123');
      });
    });
  });

  describe('createTenantRepositoryFactory', () => {
    it('debería crear un provider factory con token correcto', () => {
      // Arrange
      const entity = MockUserEntity;

      // Act
      const provider = createTenantRepositoryFactory(entity);

      // Assert
      expect(provider).toBeDefined();
      expect(provider.provide).toBe(
        `TENANT_REPOSITORY_User${TOKEN_CONSTANTS.FACTORY_SUFFIX}`,
      );
      expect(provider.useFactory).toBeInstanceOf(Function);
      expect(provider.inject).toEqual([TENANT_CONNECTION_SERVICE]);
    });

    it('debería crear factory con tokens únicos para diferentes entidades', () => {
      // Arrange
      const userEntity = MockUserEntity;
      const orderEntity = MockOrderEntity;

      // Act
      const userFactory = createTenantRepositoryFactory(userEntity);
      const orderFactory = createTenantRepositoryFactory(orderEntity);

      // Assert
      expect(userFactory.provide).toBe('TENANT_REPOSITORY_User_FACTORY');
      expect(orderFactory.provide).toBe('TENANT_REPOSITORY_Order_FACTORY');
      expect(userFactory.provide).not.toBe(orderFactory.provide);
    });

    describe('useFactory', () => {
      it('debería retornar una función factory', () => {
        // Arrange
        const entity = MockUserEntity;
        const provider = createTenantRepositoryFactory(entity);

        // Act
        const factory = provider.useFactory!(mockTenantConnectionService);

        // Assert
        expect(factory).toBeInstanceOf(Function);
      });

      it('debería crear repositorio cuando se llama la función factory', async () => {
        // Arrange
        const entity = MockUserEntity;
        const provider = createTenantRepositoryFactory(entity);
        const tenantId = 'factory-tenant';

        // Act
        const factory = provider.useFactory!(mockTenantConnectionService);
        const result = await factory(tenantId);

        // Assert
        expect(result).toBe(mockRepository);
        expect(
          mockTenantConnectionService.getConnectionForSchema,
        ).toHaveBeenCalledWith(`tenant_${tenantId}`);
        expect(mockDataSource.getRepository).toHaveBeenCalledWith(entity);
      });

      it('debería manejar múltiples llamadas a la factory con diferentes tenants', async () => {
        // Arrange
        const entity = MockUserEntity;
        const provider = createTenantRepositoryFactory(entity);
        const factory = provider.useFactory!(mockTenantConnectionService);

        // Act
        await factory('tenant-1');
        await factory('tenant-2');

        // Assert
        expect(
          mockTenantConnectionService.getConnectionForSchema,
        ).toHaveBeenCalledTimes(2);
        expect(
          mockTenantConnectionService.getConnectionForSchema,
        ).toHaveBeenNthCalledWith(1, 'tenant_tenant-1');
        expect(
          mockTenantConnectionService.getConnectionForSchema,
        ).toHaveBeenNthCalledWith(2, 'tenant_tenant-2');
      });

      it('debería manejar errores en la función factory', async () => {
        // Arrange
        const entity = MockUserEntity;
        const provider = createTenantRepositoryFactory(entity);
        const factory = provider.useFactory!(mockTenantConnectionService);
        const connectionError = new Error('Factory connection failed');
        mockTenantConnectionService.getConnectionForSchema.mockRejectedValue(
          connectionError,
        );

        // Act & Assert
        await expect(factory('failing-tenant')).rejects.toThrow(
          'Factory connection failed',
        );
      });
    });
  });

  describe('Verificación de tipos y contratos', () => {
    it('debería retornar providers que implementen la interfaz Provider correctamente', () => {
      // Arrange
      const entity = MockUserEntity;

      // Act
      const singleProvider = createTenantRepositoryProvider(entity);
      const multipleProviders = createTenantRepositoryProviders([entity]);
      const specificProvider = createSpecificTenantRepositoryProvider(
        entity,
        'test',
      );
      const factoryProvider = createTenantRepositoryFactory(entity);

      // Assert
      const providers: Provider[] = [
        singleProvider,
        ...multipleProviders,
        TenantDataSourceProvider,
        specificProvider,
        factoryProvider,
      ];

      for (const provider of providers) {
        expect(provider).toHaveProperty('provide');
        expect(provider).toHaveProperty('useFactory');
        expect(provider).toHaveProperty('inject');
        expect(typeof provider.provide).toBe('string');
        expect(typeof provider.useFactory).toBe('function');
        expect(Array.isArray(provider.inject)).toBe(true);
      }
    });

    it('debería manejar entidades con diferentes formatos de nombre', () => {
      // Arrange
      const stringEntity = 'StringEntity';
      const classEntity = MockUserEntity;
      const entityWithOptions = {
        name: 'CustomEntity',
        options: { name: 'OptionsEntity' },
      };

      // Act
      const stringProvider = createTenantRepositoryProvider(stringEntity);
      const classProvider = createTenantRepositoryProvider(classEntity);
      const optionsProvider = createTenantRepositoryProvider(
        entityWithOptions as any,
      );

      // Assert
      expect(stringProvider.provide).toBe('TENANT_REPOSITORY_StringEntity');
      expect(classProvider.provide).toBe('TENANT_REPOSITORY_User');
      expect(optionsProvider.provide).toBe('TENANT_REPOSITORY_CustomEntity');
    });
  });

  describe('Pruebas de rendimiento', () => {
    it('debería crear providers de manera eficiente para múltiples entidades', () => {
      // Arrange
      const entities = Array.from({ length: 100 }, (_, i) => `Entity${i}`);
      const startTime = performance.now();

      // Act
      const providers = createTenantRepositoryProviders(entities);
      const endTime = performance.now();

      // Assert
      expect(providers).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Debería tomar menos de 100ms
    });

    it('debería manejar la creación de múltiples factories sin degradación de rendimiento', () => {
      // Arrange
      const entities = [MockUserEntity, MockOrderEntity, MockProductEntity];
      const startTime = performance.now();

      // Act
      const factories = entities.map(entity =>
        createTenantRepositoryFactory(entity),
      );
      const endTime = performance.now();

      // Assert
      expect(factories).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(50); // Debería tomar menos de 50ms
    });

    it('debería ejecutar useFactory de manera eficiente', async () => {
      // Arrange
      const entity = MockUserEntity;
      const provider = createTenantRepositoryProvider(entity);
      const startTime = performance.now();

      // Act
      await provider.useFactory!(
        mockTenantConnectionService,
        mockTenantContextService,
      );
      const endTime = performance.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(10); // Debería tomar menos de 10ms
    });
  });

  describe('Casos edge y manejo de errores', () => {
    it('debería manejar entidades undefined graciosamente', () => {
      // Act & Assert - Estas deberían lanzar errores ya que son entradas inválidas
      expect(() => createTenantRepositoryProvider(undefined as any)).toThrow();
    });

    it('debería manejar tenantId vacío en createSpecificTenantRepositoryProvider', () => {
      // Arrange
      const entity = MockUserEntity;
      const emptyTenantId = '';

      // Act
      const provider = createSpecificTenantRepositoryProvider(
        entity,
        emptyTenantId,
      );

      // Assert
      expect(provider.provide).toBe('TENANT_REPOSITORY_User_');
    });

    it('debería manejar caracteres especiales en tenantId', async () => {
      // Arrange
      const entity = MockUserEntity;
      const specialTenantId = 'tenant-with-special-chars_123!@#';
      const provider = createSpecificTenantRepositoryProvider(
        entity,
        specialTenantId,
      );

      // Act
      await provider.useFactory!(mockTenantConnectionService);

      // Assert
      expect(
        mockTenantConnectionService.getConnectionForSchema,
      ).toHaveBeenCalledWith(`tenant_${specialTenantId}`);
    });

    it('debería manejar contexto de tenant parcialmente válido', async () => {
      // Arrange
      const entity = MockUserEntity;
      const provider = createTenantRepositoryProvider(entity);
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: 'valid-tenant',
        tenantSchema: undefined as any,
        hasTenant: true,
      });

      // Act & Assert
      await expect(
        provider.useFactory!(
          mockTenantConnectionService,
          mockTenantContextService,
        ),
      ).rejects.toThrow('No tenant context available for repository creation');
    });

    it('debería manejar timeout en conexión de base de datos', async () => {
      // Arrange
      const entity = MockUserEntity;
      const provider = createTenantRepositoryProvider(entity);
      const timeoutError = new Error('Connection timeout');
      mockTenantConnectionService.getConnectionForSchema.mockRejectedValue(
        timeoutError,
      );

      // Act & Assert
      await expect(
        provider.useFactory!(
          mockTenantConnectionService,
          mockTenantContextService,
        ),
      ).rejects.toThrow('Connection timeout');
    });
  });
});
