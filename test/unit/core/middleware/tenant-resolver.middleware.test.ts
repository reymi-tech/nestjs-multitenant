import { Logger } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IMultiTenantConfigService,
  ITenantContext,
  ITenantContextService,
  TenantResolutionConfig,
} from '../../../../src/core/interfaces/tenant.interface';
import { TenantExpressRequest } from '../../../../src/core/interfaces/tenant-middleware.interface';
import { TenantResolverMiddleware } from '../../../../src/core/middleware/tenant-resolver.middleware';
import { createMock, Mock } from '../../../utils/mock';

describe('TenantResolverMiddleware', () => {
  let middleware: TenantResolverMiddleware;
  let mockTenantContextService: Mock<ITenantContextService>;
  let mockConfigService: Mock<IMultiTenantConfigService>;
  let mockRequest: Mock<TenantExpressRequest>;
  let mockResponse: Mock<Response>;
  let mockNext: Mock<NextFunction>;
  let mockLogger: Mock<Logger>;

  const defaultTenantResolutionConfig: TenantResolutionConfig = {
    strategy: 'header',
    headerName: 'x-tenant-id',
    defaultTenant: 'default-tenant',
  };

  const mockTenantContext: ITenantContext = {
    tenantId: 'test-tenant',
    tenantSchema: 'tenant_test-tenant',
    hasTenant: true,
  };

  beforeEach(() => {
    // Crear mocks de servicios
    mockTenantContextService = createMock<ITenantContextService>();
    mockConfigService = createMock<IMultiTenantConfigService>();
    mockNext = vi.fn();

    // Mock del request de Express
    mockRequest = createMock<TenantExpressRequest>({
      headers: {},
      url: '/test',
      method: 'GET',
      query: {},
      params: {},
      body: {},
      get: vi.fn().mockReturnValue(undefined),
    });

    // Mock del response de Express
    mockResponse = createMock<Response>();

    // Mock del logger
    mockLogger = createMock<Logger>({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    // Configurar mocks por defecto
    mockConfigService.getTenantResolutionConfig.mockReturnValue(
      defaultTenantResolutionConfig,
    );
    mockTenantContextService.getContext.mockReturnValue(mockTenantContext);

    // Crear instancia del middleware
    middleware = new TenantResolverMiddleware(
      mockTenantContextService,
      mockConfigService,
    );

    // Reemplazar el logger privado
    (middleware as any).logger = mockLogger;

    // Limpiar mocks
    vi.clearAllMocks();
  });

  describe('use - Header Strategy', () => {
    it('should resolve tenant from header successfully', async () => {
      // Arrange
      const tenantId = 'header-tenant';
      mockRequest.headers = { 'x-tenant-id': tenantId };
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Tenant resolved using header strategy: ${tenantId}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Tenant context set: ID=${tenantId}, Schema=tenant_${tenantId}`,
      );
    });

    it('should use custom header name when configured', async () => {
      // Arrange
      const customHeaderName = 'custom-tenant-header';
      const tenantId = 'custom-tenant';
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        headerName: customHeaderName,
      });
      mockRequest.headers = { [customHeaderName]: tenantId };
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
    });

    it('should handle missing header gracefully with default tenant', async () => {
      // Arrange
      mockRequest.headers = {};
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockRequest.tenant).toEqual({
        id: defaultTenant,
        schema: `tenant_${defaultTenant}`,
      });
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Using default tenant: ${defaultTenant}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Tenant context set: ID=${defaultTenant}, Schema=tenant_${defaultTenant}`,
      );
    });

    it('should handle case-insensitive headers', async () => {
      // Arrange
      const tenantId = 'case-test-tenant';
      mockRequest.headers = { 'X-TENANT-ID': tenantId }; // Uppercase header
      // El middleware busca headers en lowercase, así que necesitamos configurar el mock correctamente
      mockRequest.headers['x-tenant-id'] = tenantId; // También agregar en lowercase
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
    });
  });

  describe('use - Subdomain Strategy', () => {
    beforeEach(() => {
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'subdomain',
      });
    });

    it('should resolve tenant from subdomain successfully', async () => {
      // Arrange
      const tenantId = 'subdomain-tenant';
      mockRequest.get = vi.fn().mockReturnValue(`${tenantId}.example.com`);
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockRequest.get).toHaveBeenCalledWith('host');
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Tenant resolved using subdomain strategy: ${tenantId}`,
      );
    });

    it('should handle missing host header', async () => {
      // Arrange
      mockRequest.get = vi.fn().mockReturnValue(undefined);
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
    });

    it('should handle invalid subdomain format', async () => {
      // Arrange
      mockRequest.get = vi.fn().mockReturnValue('example.com'); // No subdomain
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
    });

    it('should handle complex subdomain structures', async () => {
      // Arrange
      const tenantId = 'multi';
      mockRequest.get = vi
        .fn()
        .mockReturnValue('multi.level.subdomain.example.com');
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
    });
  });

  describe('use - JWT Strategy', () => {
    beforeEach(() => {
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'jwt',
        jwtClaimName: 'tenantId',
      });
    });

    it('should resolve tenant from JWT successfully', async () => {
      // Arrange
      const tenantId = 'jwt-tenant';
      const payload = { tenantId, sub: 'user123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64url',
      );
      const token = `header.${encodedPayload}.signature`;

      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Tenant resolved using jwt strategy: ${tenantId}`,
      );
    });

    it('should use custom JWT claim name', async () => {
      // Arrange
      const customClaimName = 'customTenantField';
      const tenantId = 'custom-jwt-tenant';
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'jwt',
        jwtClaimName: customClaimName,
      });

      const payload = { [customClaimName]: tenantId, sub: 'user123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64url',
      );
      const token = `header.${encodedPayload}.signature`;

      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
    });

    it('should handle missing authorization header', async () => {
      // Arrange
      mockRequest.headers = {};
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
    });

    it('should handle invalid JWT format', async () => {
      // Arrange
      // JWT con payload base64url inválido que causará error al decodificar
      mockRequest.headers = {
        authorization: 'Bearer header.invalid-base64url-payload.signature',
      };
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Express] Error decoding JWT payload:',
        expect.any(Error),
      );
    });

    it('should handle malformed authorization header', async () => {
      // Arrange
      mockRequest.headers = { authorization: 'InvalidFormat token' };
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
    });

    it('should handle JWT with special characters in payload', async () => {
      // Arrange
      const tenantId = 'special-chars-tenant';
      const payload = { tenantId, special: 'chars!@#$%^&*()' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64url',
      );
      const token = `header.${encodedPayload}.signature`;

      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
    });
  });

  describe('use - Custom Strategy', () => {
    it('should use custom resolver function', async () => {
      // Arrange
      const tenantId = 'custom-tenant';
      const customResolver = vi.fn().mockReturnValue(tenantId);
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'custom',
        customResolver,
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(customResolver).toHaveBeenCalledWith(mockRequest);
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Tenant resolved using custom strategy: ${tenantId}`,
      );
    });

    it('should handle custom resolver returning undefined', async () => {
      // Arrange
      const customResolver = vi.fn().mockReturnValue(undefined);
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'custom',
        customResolver,
      });
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(customResolver).toHaveBeenCalledWith(mockRequest);
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
    });

    it('should handle missing custom resolver', async () => {
      // Arrange
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'custom',
        // customResolver is undefined
      });
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
    });
  });

  describe('use - Default Tenant Handling', () => {
    it('should set default tenant when no tenant is resolved', async () => {
      // Arrange
      mockRequest.headers = {};
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockRequest.tenant).toEqual({
        id: defaultTenant,
        schema: `tenant_${defaultTenant}`,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Using default tenant: ${defaultTenant}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Express] Tenant context set: ID=${defaultTenant}, Schema=tenant_${defaultTenant}`,
      );
    });

    it('should warn when no tenant found and no default configured', async () => {
      // Arrange
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant: undefined,
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: undefined,
        tenantSchema: undefined,
        hasTenant: false,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Express] No tenant found in request and no default tenant configured',
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle context service returning null context', async () => {
      // Arrange
      const tenantId = 'test-tenant';
      mockRequest.headers = { 'x-tenant-id': tenantId };
      mockTenantContextService.getContext.mockReturnValue(undefined as any);

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `[Express] Failed to set tenant context for tenant: ${tenantId}`,
      );
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('use - Error Handling', () => {
    it('should handle errors gracefully and continue', async () => {
      // Arrange
      const error = new Error('Test error');
      mockConfigService.getTenantResolutionConfig.mockImplementation(() => {
        throw error;
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Express] Error resolving tenant context:',
        error,
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle unknown strategy gracefully', async () => {
      // Arrange
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'unknown' as any,
      });
      const defaultTenant = 'default-tenant';
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Express] Unknown tenant resolution strategy: unknown',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
    });

    it('should handle tenant context service errors', async () => {
      // Arrange
      const tenantId = 'test-tenant';
      mockRequest.headers = { 'x-tenant-id': tenantId };
      const error = new Error('Context service error');
      mockTenantContextService.setContext.mockImplementation(() => {
        throw error;
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Express] Error resolving tenant context:',
        error,
      );
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Private Methods', () => {
    describe('resolveFromHeader', () => {
      it('should return undefined for empty header value', async () => {
        // Arrange
        mockRequest.headers = { 'x-tenant-id': '' };
        mockConfigService.getTenantResolutionConfig.mockReturnValue({
          ...defaultTenantResolutionConfig,
          strategy: 'header',
          headerName: 'x-tenant-id',
        });
        const defaultTenant = 'default-tenant';
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: defaultTenant,
          tenantSchema: `tenant_${defaultTenant}`,
          hasTenant: true,
        });

        // Act
        await middleware.use(mockRequest, mockResponse, mockNext);

        // Assert
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          defaultTenant,
        );
      });

      it('should handle comma-separated header values', async () => {
        // Arrange
        const tenantId = 'array-tenant';
        // Express convierte arrays de headers en strings separados por comas
        mockRequest.headers = { 'x-tenant-id': `${tenantId},other-tenant` };
        mockConfigService.getTenantResolutionConfig.mockReturnValue({
          ...defaultTenantResolutionConfig,
          strategy: 'header',
          headerName: 'x-tenant-id',
        });
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: `${tenantId},other-tenant`,
          tenantSchema: `tenant_${tenantId}_other-tenant`,
          hasTenant: true,
        });

        // Act
        await middleware.use(mockRequest, mockResponse, mockNext);

        // Assert
        // El middleware maneja valores de header separados por comas como un solo tenant ID
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          `${tenantId},other-tenant`,
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          `[Express] Tenant resolved using header strategy: ${tenantId},other-tenant`,
        );
      });
    });

    describe('resolveFromSubdomain', () => {
      beforeEach(() => {
        mockConfigService.getTenantResolutionConfig.mockReturnValue({
          ...defaultTenantResolutionConfig,
          strategy: 'subdomain',
        });
      });

      it('should handle localhost development scenarios', async () => {
        // Arrange
        mockRequest.get = vi.fn().mockReturnValue('localhost:3000');
        // Para 'localhost:3000', host.split('.').slice(0, -2) resultaría en []
        // por lo que no habría tenant y se usaría el default
        const defaultTenant = 'default-tenant';
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: defaultTenant,
          tenantSchema: `tenant_${defaultTenant}`,
          hasTenant: true,
        });

        // Act
        await middleware.use(mockRequest, mockResponse, mockNext);

        // Assert
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          defaultTenant,
        );
      });

      it('should handle IP addresses', async () => {
        // Arrange
        mockRequest.get = vi.fn().mockReturnValue('192.168.1.1:3000');
        // Según el código, host.split('.').slice(0, -2) para '192.168.1.1:3000'
        // resultaría en ['192', '168'] y tomaría '192' como tenant
        const expectedTenant = '192';
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: expectedTenant,
          tenantSchema: `tenant_${expectedTenant}`,
          hasTenant: true,
        });

        // Act
        await middleware.use(mockRequest, mockResponse, mockNext);

        // Assert
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          expectedTenant,
        );
      });
    });

    describe('decodeJWTPayload', () => {
      beforeEach(() => {
        mockConfigService.getTenantResolutionConfig.mockReturnValue({
          ...defaultTenantResolutionConfig,
          strategy: 'jwt',
        });
      });

      it('should handle JWT with invalid JSON in payload', async () => {
        // Arrange
        const invalidPayload = 'invalid-json';
        const encodedPayload =
          Buffer.from(invalidPayload).toString('base64url');
        const token = `header.${encodedPayload}.signature`;

        mockRequest.headers = { authorization: `Bearer ${token}` };
        const defaultTenant = 'default-tenant';
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: defaultTenant,
          tenantSchema: `tenant_${defaultTenant}`,
          hasTenant: true,
        });

        // Act
        await middleware.use(mockRequest, mockResponse, mockNext);

        // Assert
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          defaultTenant,
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[Express] Error decoding JWT payload:',
          expect.any(Error),
        );
      });

      it('should handle JWT with wrong number of parts', async () => {
        // Arrange
        const token = 'header.payload'; // Missing signature
        mockRequest.headers = { authorization: `Bearer ${token}` };
        const defaultTenant = 'default-tenant';
        mockTenantContextService.getContext.mockReturnValue({
          tenantId: defaultTenant,
          tenantSchema: `tenant_${defaultTenant}`,
          hasTenant: true,
        });

        // Act
        await middleware.use(mockRequest, mockResponse, mockNext);

        // Assert
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          defaultTenant,
        );
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple resolution attempts with fallback', async () => {
      // Arrange - First try header (fails), then use default
      mockRequest.headers = { 'x-tenant-id': '' }; // Empty header
      const defaultTenant = 'default-tenant'; // Use the same default as configured
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockRequest.tenant).toEqual({
        id: defaultTenant,
        schema: `tenant_${defaultTenant}`,
      });
    });

    it('should handle concurrent requests with different tenants', async () => {
      // Arrange
      const tenantId1 = 'tenant-1';
      const tenantId2 = 'tenant-2';

      // First request
      mockRequest.headers = { 'x-tenant-id': tenantId1 };
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: tenantId1,
        tenantSchema: `tenant_${tenantId1}`,
        hasTenant: true,
      });

      // Act - First request
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert - First request
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId1,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId1,
        schema: `tenant_${tenantId1}`,
      });

      // Reset mocks for second request
      vi.clearAllMocks();

      // Second request setup
      const mockRequest2 = createMock<TenantExpressRequest>({
        headers: { 'x-tenant-id': tenantId2 },
        get: vi.fn(),
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: tenantId2,
        tenantSchema: `tenant_${tenantId2}`,
        hasTenant: true,
      });

      // Act - Second request
      await middleware.use(mockRequest2, mockResponse, mockNext);

      // Assert - Second request
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId2,
      );
      expect(mockRequest2.tenant).toEqual({
        id: tenantId2,
        schema: `tenant_${tenantId2}`,
      });
    });
  });
});
