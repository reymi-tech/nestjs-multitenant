import { Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IMultiTenantConfigService,
  ITenantContext,
  ITenantContextService,
  TenantResolutionConfig,
} from '../../../src/interface/tenant.interface';
import { TenantFastifyRequest } from '../../../src/interface/tenant-middleware.interface';
import { TenantFastifyMiddleware } from '../../../src/middleware/tenant-fastify.middleware';
import { createMock, Mock } from '../../utils/mock';

describe('TenantFastifyMiddleware', () => {
  let middleware: TenantFastifyMiddleware;
  let mockTenantContextService: Mock<ITenantContextService>;
  let mockConfigService: Mock<IMultiTenantConfigService>;
  let mockRequest: Mock<TenantFastifyRequest>;
  let mockReply: Mock<FastifyReply['raw']>;
  let mockDone: Mock<(error?: Error) => void>;
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
    mockDone = vi.fn();

    // Mock del request de Fastify
    mockRequest = createMock<TenantFastifyRequest>({
      headers: {},
      url: '/test',
      method: 'GET',
      query: {},
      params: {},
      body: {},
    });

    // Mock del reply de Fastify
    mockReply = createMock<FastifyReply['raw']>({
      setHeader: vi.fn(),
    });

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
    middleware = new TenantFastifyMiddleware(
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
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
      expect(mockReply.setHeader).toHaveBeenCalledWith('X-Tenant-ID', tenantId);
      expect(mockReply.setHeader).toHaveBeenCalledWith(
        'X-Tenant-Schema',
        `tenant_${tenantId}`,
      );
      expect(mockDone).toHaveBeenCalledWith();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Tenant resolved using header strategy: ${tenantId}`,
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
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
    });

    it('should handle missing header gracefully', async () => {
      // Arrange
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'header',
        defaultTenant: 'default-tenant',
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: 'default-tenant',
        tenantSchema: 'tenant_default-tenant',
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Using default tenant: default-tenant',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        'default-tenant',
      );
      expect(mockDone).toHaveBeenCalledWith();
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
      mockRequest.headers = { host: `${tenantId}.example.com` };
      mockTenantContextService.getContext.mockReturnValue({
        tenantId,
        tenantSchema: `tenant_${tenantId}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Tenant resolved using subdomain strategy: ${tenantId}`,
      );
    });

    it('should handle missing host header', async () => {
      // Arrange
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'subdomain',
        defaultTenant: 'default-tenant',
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: 'default-tenant',
        tenantSchema: 'tenant_default-tenant',
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Using default tenant: default-tenant',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        'default-tenant',
      );
      expect(mockDone).toHaveBeenCalledWith();
    });

    it('should handle invalid subdomain format', async () => {
      // Arrange
      mockRequest.headers = { host: 'example.com' }; // No subdomain
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'subdomain',
        defaultTenant: 'default-tenant',
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: 'default-tenant',
        tenantSchema: 'tenant_default-tenant',
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Using default tenant: default-tenant',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        'default-tenant',
      );
      expect(mockDone).toHaveBeenCalledWith();
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
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Tenant resolved using jwt strategy: ${tenantId}`,
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
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
    });

    it('should handle missing authorization header', async () => {
      // Arrange
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'jwt',
        defaultTenant: 'default-tenant',
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: 'default-tenant',
        tenantSchema: 'tenant_default-tenant',
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Using default tenant: default-tenant',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        'default-tenant',
      );
      expect(mockDone).toHaveBeenCalledWith();
    });

    it('should handle invalid JWT format', async () => {
      // Arrange
      // JWT con payload base64url inválido que causará error al decodificar
      mockRequest.headers = {
        authorization: 'Bearer header.invalid-base64url-payload.signature',
      };
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'jwt',
        defaultTenant: 'default-tenant',
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: 'default-tenant',
        tenantSchema: 'tenant_default-tenant',
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Error decoding JWT payload:',
        expect.any(Error),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Using default tenant: default-tenant',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        'default-tenant',
      );
      expect(mockDone).toHaveBeenCalledWith();
    });

    it('should handle malformed authorization header', async () => {
      // Arrange
      mockRequest.headers = { authorization: 'InvalidFormat token' };
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'jwt',
        defaultTenant: 'default-tenant',
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: 'default-tenant',
        tenantSchema: 'tenant_default-tenant',
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Using default tenant: default-tenant',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        'default-tenant',
      );
      expect(mockDone).toHaveBeenCalledWith();
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
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(customResolver).toHaveBeenCalledWith({
        headers: mockRequest.headers,
        url: mockRequest.url,
        method: mockRequest.method,
        query: mockRequest.query,
        params: mockRequest.params,
        body: mockRequest.body,
        get: expect.any(Function),
        header: expect.any(Function),
      });
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockRequest.tenant).toEqual({
        id: tenantId,
        schema: `tenant_${tenantId}`,
      });
    });

    it('should handle custom resolver returning undefined', async () => {
      // Arrange
      const customResolver = vi.fn().mockReturnValue(undefined);
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'custom',
        customResolver,
        defaultTenant: 'default-tenant',
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: 'default-tenant',
        tenantSchema: 'tenant_default-tenant',
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(customResolver).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Using default tenant: default-tenant',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        'default-tenant',
      );
      expect(mockDone).toHaveBeenCalledWith();
    });

    it('should handle missing custom resolver', async () => {
      // Arrange
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'custom',
        defaultTenant: 'default-tenant',
        // customResolver is undefined
      });
      const defaultTenant = 'default-tenant';

      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Using default tenant: default-tenant',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] Tenant context set: ID=default-tenant, Schema=tenant_default-tenant',
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        'default-tenant',
      );
    });
  });

  describe('use - Default Tenant Handling', () => {
    it('should use default tenant when no tenant is resolved', async () => {
      // Arrange
      const defaultTenant = 'default-tenant';
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant,
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Using default tenant: ${defaultTenant}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Tenant context set: ID=${defaultTenant}, Schema=tenant_${defaultTenant}`,
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockRequest.tenant).toEqual({
        id: defaultTenant,
        schema: `tenant_${defaultTenant}`,
      });
      expect(mockReply.setHeader).toHaveBeenCalledWith(
        'X-Tenant-ID',
        defaultTenant,
      );
      expect(mockReply.setHeader).toHaveBeenCalledWith(
        'X-Tenant-Schema',
        `tenant_${defaultTenant}`,
      );
      expect(mockDone).toHaveBeenCalledWith();
    });

    it('should not use default tenant when tenant is already resolved', async () => {
      // Arrange
      const resolvedTenant = 'resolved-tenant';
      const defaultTenant = 'default-tenant';
      mockRequest.headers = { 'x-tenant-id': resolvedTenant };
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant,
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: resolvedTenant,
        tenantSchema: `tenant_${resolvedTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Tenant resolved using header strategy: ${resolvedTenant}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Tenant context set: ID=${resolvedTenant}, Schema=tenant_${resolvedTenant}`,
      );
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        `[Fastify] Using default tenant: ${defaultTenant}`,
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        resolvedTenant,
      );
      expect(mockRequest.tenant).toEqual({
        id: resolvedTenant,
        schema: `tenant_${resolvedTenant}`,
      });
    });

    it('should handle no tenant resolved and no default tenant configured', async () => {
      // Arrange
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant: undefined,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] No tenant found in request and no default tenant configured',
      );
      expect(mockTenantContextService.setContext).not.toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalledWith();
    });

    it('should handle context service returning undefined context', async () => {
      // Arrange
      const tenantId = 'test-tenant';
      mockRequest.headers = { 'x-tenant-id': tenantId };
      mockTenantContextService.getContext.mockReturnValue(undefined as any);

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        tenantId,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `[Fastify] Failed to set tenant context for tenant: ${tenantId}`,
      );
      expect(mockDone).toHaveBeenCalledWith();
    });

    it('should handle default tenant with undefined context from service', async () => {
      // Arrange
      const defaultTenant = 'default-tenant';
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant,
      });
      mockTenantContextService.getContext.mockReturnValue(undefined as any);

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `[Fastify] Failed to set tenant context for tenant: ${defaultTenant}`,
      );
      expect(mockDone).toHaveBeenCalledWith();
    });
  });

  describe('use - Edge Cases for Default Tenant', () => {
    it('should handle empty string as default tenant', async () => {
      // Arrange
      const defaultTenant = '';
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      // Empty string is falsy, so it should be treated as no default tenant
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] No tenant found in request and no default tenant configured',
      );
      expect(mockTenantContextService.setContext).not.toHaveBeenCalled();
    });

    it('should handle numeric string as default tenant', async () => {
      // Arrange
      const defaultTenant = '12345';
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant,
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Using default tenant: ${defaultTenant}`,
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockRequest.tenant).toEqual({
        id: defaultTenant,
        schema: `tenant_${defaultTenant}`,
      });
    });

    it('should handle special characters in default tenant', async () => {
      // Arrange
      const defaultTenant = 'tenant-with-special_chars.123';
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant,
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Using default tenant: ${defaultTenant}`,
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockRequest.tenant).toEqual({
        id: defaultTenant,
        schema: `tenant_${defaultTenant}`,
      });
    });

    it('should handle very long default tenant name', async () => {
      // Arrange
      const defaultTenant = 'a'.repeat(100); // 100 character tenant name
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant,
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: defaultTenant,
        tenantSchema: `tenant_${defaultTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Using default tenant: ${defaultTenant}`,
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        defaultTenant,
      );
      expect(mockRequest.tenant).toEqual({
        id: defaultTenant,
        schema: `tenant_${defaultTenant}`,
      });
    });

    it('should prioritize resolved tenant over default tenant in all strategies', async () => {
      // Arrange
      const resolvedTenant = 'resolved-tenant';
      const defaultTenant = 'default-tenant';

      // Test with header strategy
      mockRequest.headers = { 'x-tenant-id': resolvedTenant };
      mockRequest.hostname = `${resolvedTenant}.example.com`;
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        strategy: 'header',
        headerName: 'x-tenant-id',
        defaultTenant,
      });
      mockTenantContextService.getContext.mockReturnValue({
        tenantId: resolvedTenant,
        tenantSchema: `tenant_${resolvedTenant}`,
        hasTenant: true,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Tenant resolved using header strategy: ${resolvedTenant}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `[Fastify] Tenant context set: ID=${resolvedTenant}, Schema=tenant_${resolvedTenant}`,
      );
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        `[Fastify] Using default tenant: ${defaultTenant}`,
      );
      expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
        resolvedTenant,
      );
    });

    it('should handle null/undefined values gracefully', async () => {
      // Arrange
      mockRequest.headers = {};
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        defaultTenant: undefined,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] No tenant found in request and no default tenant configured',
      );
      expect(mockTenantContextService.setContext).not.toHaveBeenCalled();
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
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Fastify] Error resolving tenant context:',
        error,
      );
      expect(mockDone).toHaveBeenCalledWith();
    });

    it('should handle unknown strategy gracefully', async () => {
      // Arrange
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'unknown' as any,
        defaultTenant: undefined,
      });

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Fastify] Unknown tenant resolution strategy: unknown',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[Fastify] No tenant found in request and no default tenant configured',
      );
      expect(mockDone).toHaveBeenCalledWith();
    });
  });

  describe('adaptFastifyRequest', () => {
    it('should adapt Fastify request to Express-like format', async () => {
      // Arrange
      const customResolver = vi.fn().mockReturnValue('test-tenant');
      mockConfigService.getTenantResolutionConfig.mockReturnValue({
        ...defaultTenantResolutionConfig,
        strategy: 'custom',
        customResolver,
      });
      mockRequest.headers = { 'content-type': 'application/json' };

      // Act
      await middleware.use(mockRequest, mockReply, mockDone);

      // Assert
      const adaptedRequest = customResolver.mock.calls[0][0];
      expect(adaptedRequest).toHaveProperty('headers', mockRequest.headers);
      expect(adaptedRequest).toHaveProperty('url', mockRequest.url);
      expect(adaptedRequest).toHaveProperty('method', mockRequest.method);
      expect(adaptedRequest).toHaveProperty('query', mockRequest.query);
      expect(adaptedRequest).toHaveProperty('params', mockRequest.params);
      expect(adaptedRequest).toHaveProperty('body', mockRequest.body);
      expect(adaptedRequest).toHaveProperty('get');
      expect(adaptedRequest).toHaveProperty('header');

      // Test get and header methods
      expect(adaptedRequest.get('content-type')).toBe('application/json');
      expect(adaptedRequest.header('content-type')).toBe('application/json');
    });
  });

  describe('Private Methods', () => {
    describe('resolveFromHeader', () => {
      it('should resolve tenant from header case-insensitively', async () => {
        // Arrange
        const tenantId = 'case-test-tenant';
        // Fastify normaliza automáticamente los encabezados a minúsculas
        mockRequest.headers = {
          'x-tenant-id': tenantId, // Fastify normalizes headers to lowercase
        };
        mockTenantContextService.getContext.mockReturnValue({
          tenantId,
          tenantSchema: `tenant_${tenantId}`,
          hasTenant: true,
        });

        // Act
        await middleware.use(mockRequest, mockReply, mockDone);

        // Assert
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          tenantId,
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

      it('should handle complex subdomain structures', async () => {
        // Arrange
        const tenantId = 'multi';
        mockRequest.headers = { host: 'multi.level.subdomain.example.com' };
        mockTenantContextService.getContext.mockReturnValue({
          tenantId,
          tenantSchema: `tenant_${tenantId}`,
          hasTenant: true,
        });

        // Act
        await middleware.use(mockRequest, mockReply, mockDone);

        // Assert
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          tenantId,
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
        await middleware.use(mockRequest, mockReply, mockDone);

        // Assert
        expect(mockTenantContextService.setContext).toHaveBeenCalledWith(
          tenantId,
        );
      });
    });
  });
});
