import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IMultiTenantConfigService,
  ITenantContext,
} from '../../../../src/core/interfaces/tenant.interface';
import { TenantContextService } from '../../../../src/core/services/tenant-context.service';
import { createMock, Mock } from '../../../utils/mock';

describe('TenantContextService', () => {
  let service: TenantContextService;
  let mockConfigService: Mock<IMultiTenantConfigService>;

  // Mock data
  const mockTenantId = 'test-tenant-123';
  const mockSchemaName = 'tenant_test-tenant-123';
  const mockSchemaNamingStrategy = vi.fn(
    (tenantId: string) => `tenant_${tenantId}`,
  );

  beforeEach(() => {
    // Crear mock del servicio de configuración
    mockConfigService = createMock<IMultiTenantConfigService>();

    // Configurar comportamiento por defecto del mock
    mockConfigService.getSchemaNamingStrategy.mockReturnValue(
      mockSchemaNamingStrategy,
    );

    // Crear instancia del servicio con el mock
    service = new TenantContextService(mockConfigService);

    // Limpiar mocks después de cada test
    vi.clearAllMocks();
  });

  describe('Constructor and Initial State', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have undefined tenantId and tenantSchema initially', () => {
      expect(service.tenantId).toBeUndefined();
      expect(service.tenantSchema).toBeUndefined();
    });

    it('should inject config service correctly', () => {
      expect(mockConfigService).toBeDefined();
    });
  });

  describe('setContext', () => {
    it('should set tenant context successfully with valid tenantId', () => {
      // Arrange
      const tenantId = mockTenantId;

      // Act
      service.setContext(tenantId);

      // Assert
      expect(service.tenantId).toBe(tenantId);
      expect(service.tenantSchema).toBe(mockSchemaName);
      expect(mockConfigService.getSchemaNamingStrategy).toHaveBeenCalledTimes(
        1,
      );
      expect(mockSchemaNamingStrategy).toHaveBeenCalledWith(tenantId);
    });

    it('should handle empty string tenantId', () => {
      // Arrange
      const tenantId = '';
      const expectedSchema = 'tenant_';

      // Act
      service.setContext(tenantId);

      // Assert
      expect(service.tenantId).toBe(tenantId);
      expect(service.tenantSchema).toBe(expectedSchema);
      expect(mockSchemaNamingStrategy).toHaveBeenCalledWith(tenantId);
    });

    it('should handle special characters in tenantId', () => {
      // Arrange
      const tenantId = 'tenant-with-special_chars.123';
      const expectedSchema = `tenant_${tenantId}`;

      // Act
      service.setContext(tenantId);

      // Assert
      expect(service.tenantId).toBe(tenantId);
      expect(service.tenantSchema).toBe(expectedSchema);
      expect(mockSchemaNamingStrategy).toHaveBeenCalledWith(tenantId);
    });

    it('should handle very long tenantId', () => {
      // Arrange
      const tenantId = 'a'.repeat(100);
      const expectedSchema = `tenant_${tenantId}`;

      // Act
      service.setContext(tenantId);

      // Assert
      expect(service.tenantId).toBe(tenantId);
      expect(service.tenantSchema).toBe(expectedSchema);
      expect(mockSchemaNamingStrategy).toHaveBeenCalledWith(tenantId);
    });

    it('should overwrite previous tenant context', () => {
      // Arrange
      const firstTenantId = 'first-tenant';
      const secondTenantId = 'second-tenant';

      // Act
      service.setContext(firstTenantId);
      service.setContext(secondTenantId);

      // Assert
      expect(service.tenantId).toBe(secondTenantId);
      expect(service.tenantSchema).toBe(`tenant_${secondTenantId}`);
      expect(mockSchemaNamingStrategy).toHaveBeenCalledTimes(2);
      expect(mockSchemaNamingStrategy).toHaveBeenNthCalledWith(
        1,
        firstTenantId,
      );
      expect(mockSchemaNamingStrategy).toHaveBeenNthCalledWith(
        2,
        secondTenantId,
      );
    });

    it('should handle custom schema naming strategy', () => {
      // Arrange
      const tenantId = mockTenantId;
      const customNamingStrategy = vi.fn(
        (id: string) => `custom_schema_${id}_suffix`,
      );
      mockConfigService.getSchemaNamingStrategy.mockReturnValue(
        customNamingStrategy,
      );

      // Act
      service.setContext(tenantId);

      // Assert
      expect(service.tenantId).toBe(tenantId);
      expect(service.tenantSchema).toBe(`custom_schema_${tenantId}_suffix`);
      expect(customNamingStrategy).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('getTenantSchema', () => {
    it('should return undefined when no context is set', () => {
      // Act
      const result = service.getTenantSchema();

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return tenant schema when context is set', () => {
      // Arrange
      service.setContext(mockTenantId);

      // Act
      const result = service.getTenantSchema();

      // Assert
      expect(result).toBe(mockSchemaName);
    });

    it('should return updated schema after context change', () => {
      // Arrange
      const firstTenantId = 'first-tenant';
      const secondTenantId = 'second-tenant';

      service.setContext(firstTenantId);
      const firstSchema = service.getTenantSchema();

      service.setContext(secondTenantId);

      // Act
      const result = service.getTenantSchema();

      // Assert
      expect(firstSchema).toBe(`tenant_${firstTenantId}`);
      expect(result).toBe(`tenant_${secondTenantId}`);
      expect(result).not.toBe(firstSchema);
    });
  });

  describe('getContext', () => {
    it('should return context with undefined values when no tenant is set', () => {
      // Act
      const result: ITenantContext = service.getContext();

      // Assert
      expect(result).toEqual({
        tenantId: undefined,
        tenantSchema: undefined,
        hasTenant: false,
      });
    });

    it('should return complete context when tenant is set', () => {
      // Arrange
      service.setContext(mockTenantId);

      // Act
      const result: ITenantContext = service.getContext();

      // Assert
      expect(result).toEqual({
        tenantId: mockTenantId,
        tenantSchema: mockSchemaName,
        hasTenant: true,
      });
    });

    it('should return hasTenant as false when tenantId is undefined', () => {
      // Arrange
      // Simular estado donde tenantId es null (aunque el setter no permite esto directamente)
      service.tenantId = undefined;
      service.tenantSchema = undefined;

      // Act
      const result: ITenantContext = service.getContext();

      // Assert
      expect(result).toEqual({
        tenantId: undefined,
        tenantSchema: undefined,
        hasTenant: false,
      });
    });

    it('should return hasTenant as true when tenantId is empty string', () => {
      // Arrange
      service.setContext('');

      // Act
      const result: ITenantContext = service.getContext();

      // Assert
      expect(result).toEqual({
        tenantId: '',
        tenantSchema: 'tenant_',
        hasTenant: true,
      });
    });

    it('should return immutable context object', () => {
      // Arrange
      service.setContext(mockTenantId);

      // Act
      const result1 = service.getContext();
      const result2 = service.getContext();

      // Assert
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different object instances
    });
  });

  describe('Private Methods Integration', () => {
    describe('setTenant (private method integration)', () => {
      it('should call calculateSchemaName internally', () => {
        // Arrange
        const tenantId = mockTenantId;

        // Act
        service.setContext(tenantId);

        // Assert
        expect(mockConfigService.getSchemaNamingStrategy).toHaveBeenCalledTimes(
          1,
        );
        expect(mockSchemaNamingStrategy).toHaveBeenCalledWith(tenantId);
        expect(service.tenantSchema).toBe(mockSchemaName);
      });
    });

    describe('calculateSchemaName (private method integration)', () => {
      it('should use config service naming strategy', () => {
        // Arrange
        const tenantId = 'integration-test';
        const customStrategy = vi.fn((id: string) => `prefix_${id}_suffix`);
        mockConfigService.getSchemaNamingStrategy.mockReturnValue(
          customStrategy,
        );

        // Act
        service.setContext(tenantId);

        // Assert
        expect(customStrategy).toHaveBeenCalledWith(tenantId);
        expect(service.tenantSchema).toBe(`prefix_${tenantId}_suffix`);
      });

      it('should handle naming strategy that returns empty string', () => {
        // Arrange
        const tenantId = 'test-tenant';
        const emptyStrategy = vi.fn(() => '');
        mockConfigService.getSchemaNamingStrategy.mockReturnValue(
          emptyStrategy,
        );

        // Act
        service.setContext(tenantId);

        // Assert
        expect(service.tenantSchema).toBe('');
        expect(emptyStrategy).toHaveBeenCalledWith(tenantId);
      });

      it('should handle naming strategy that throws error', () => {
        // Arrange
        const tenantId = 'error-tenant';
        const errorStrategy = vi.fn(() => {
          throw new Error('Naming strategy error');
        });
        mockConfigService.getSchemaNamingStrategy.mockReturnValue(
          errorStrategy,
        );

        // Act & Assert
        expect(() => service.setContext(tenantId)).toThrow(
          'Naming strategy error',
        );
        expect(errorStrategy).toHaveBeenCalledWith(tenantId);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined naming strategy', () => {
      // Arrange
      const tenantId = 'test-tenant';
      mockConfigService.getSchemaNamingStrategy.mockReturnValue(
        undefined as any,
      );

      // Act & Assert
      expect(() => service.setContext(tenantId)).toThrow();
    });

    it('should handle numeric tenantId as string', () => {
      // Arrange
      const numericTenantId = '12345';

      // Act
      service.setContext(numericTenantId);

      // Assert
      expect(service.tenantId).toBe(numericTenantId);
      expect(service.tenantSchema).toBe(`tenant_${numericTenantId}`);
    });

    it('should handle tenantId with unicode characters', () => {
      // Arrange
      const unicodeTenantId = 'tenant-测试-🏢';
      const expectedSchema = `tenant_${unicodeTenantId}`;

      // Act
      service.setContext(unicodeTenantId);

      // Assert
      expect(service.tenantId).toBe(unicodeTenantId);
      expect(service.tenantSchema).toBe(expectedSchema);
    });
  });

  describe('Service Scope and Lifecycle', () => {
    it('should maintain state within request scope', () => {
      // Arrange
      const tenantId1 = 'tenant-1';
      const tenantId2 = 'tenant-2';

      // Act
      service.setContext(tenantId1);
      const context1 = service.getContext();

      service.setContext(tenantId2);
      const context2 = service.getContext();

      // Assert
      expect(context1.tenantId).toBe(tenantId1);
      expect(context2.tenantId).toBe(tenantId2);
      expect(context1.tenantId).not.toBe(context2.tenantId);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle multiple rapid context changes', () => {
      // Arrange
      const iterations = 1000;
      const tenantIds = Array.from(
        { length: iterations },
        (_, i) => `tenant-${i}`,
      );

      // Act
      const startTime = Date.now();
      for (const tenantId of tenantIds) {
        service.setContext(tenantId);
      }
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(service.tenantId).toBe(`tenant-${iterations - 1}`);
      expect(mockSchemaNamingStrategy).toHaveBeenCalledTimes(iterations);
    });

    it('should not leak memory with repeated context changes', () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;

      // Act
      for (let i = 0; i < 10_000; i++) {
        service.setContext(`tenant-${i}`);
        service.getContext();
        service.getTenantSchema();
      }

      // Assert
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 10k operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Dependency Injection Integration', () => {
    it('should work with different config service implementations', () => {
      // Arrange
      const alternativeConfigService = createMock<IMultiTenantConfigService>();
      const alternativeStrategy = vi.fn((id: string) => `alt_${id}`);
      alternativeConfigService.getSchemaNamingStrategy.mockReturnValue(
        alternativeStrategy,
      );

      // Act
      const alternativeService = new TenantContextService(
        alternativeConfigService,
      );
      alternativeService.setContext('test');

      // Assert
      expect(alternativeService.tenantSchema).toBe('alt_test');
      expect(alternativeStrategy).toHaveBeenCalledWith('test');
    });

    it('should handle config service method calls correctly', () => {
      // Arrange
      const tenantId = 'method-test';

      // Act
      service.setContext(tenantId);

      // Assert
      expect(mockConfigService.getSchemaNamingStrategy).toHaveBeenCalledTimes(
        1,
      );
      expect(mockConfigService.getSchemaNamingStrategy).toHaveBeenCalledWith();
    });
  });

  describe('State Management', () => {
    it('should reset context when setting new tenant', () => {
      // Arrange
      service.setContext('initial-tenant');
      const initialContext = service.getContext();

      // Act
      service.setContext('new-tenant');
      const newContext = service.getContext();

      // Assert
      expect(initialContext.tenantId).toBe('initial-tenant');
      expect(newContext.tenantId).toBe('new-tenant');
      expect(newContext.tenantId).not.toBe(initialContext.tenantId);
    });

    it('should maintain consistency between tenantId and tenantSchema', () => {
      // Arrange
      const tenantId = 'consistency-test';

      // Act
      service.setContext(tenantId);

      // Assert
      expect(service.tenantId).toBe(tenantId);
      expect(service.tenantSchema).toBe(`tenant_${tenantId}`);
      expect(service.getTenantSchema()).toBe(service.tenantSchema);
      expect(service.getContext().tenantId).toBe(service.tenantId);
      expect(service.getContext().tenantSchema).toBe(service.tenantSchema);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement ITenantContextService interface correctly', () => {
      // Arrange & Act
      const hasSetContext = typeof service.setContext === 'function';
      const hasGetTenantSchema = typeof service.getTenantSchema === 'function';
      const hasGetContext = typeof service.getContext === 'function';

      // Assert
      expect(hasSetContext).toBe(true);
      expect(hasGetTenantSchema).toBe(true);
      expect(hasGetContext).toBe(true);
    });

    it('should return ITenantContext with correct structure', () => {
      // Arrange
      service.setContext('interface-test');

      // Act
      const context = service.getContext();

      // Assert
      expect(context).toHaveProperty('tenantId');
      expect(context).toHaveProperty('tenantSchema');
      expect(context).toHaveProperty('hasTenant');
      expect(typeof context.hasTenant).toBe('boolean');
    });
  });
});
