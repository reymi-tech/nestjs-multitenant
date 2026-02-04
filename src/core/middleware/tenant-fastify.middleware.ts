import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

import {
  IMultiTenantConfigService,
  ITenantContextService,
  TenantResolutionConfig,
} from '../interfaces/tenant.interface';
import {
  ITenantMiddlewareFastify,
  TenantFastifyRequest,
} from '../interfaces/tenant-middleware.interface';
import { MULTI_TENANT_CONFIG_SERVICE } from '../services/multi-tenant-config.service';
import { TENANT_CONTEXT_SERVICE } from '../services/tenant-context.service';

/**
 * Middleware to resolve tenant ID from Fastify request and set it in the tenant context.
 */
@Injectable()
export class TenantFastifyMiddleware
  implements NestMiddleware, ITenantMiddlewareFastify
{
  private readonly logger = new Logger(TenantFastifyMiddleware.name);

  constructor(
    @Inject(TENANT_CONTEXT_SERVICE)
    private readonly tenantContextService: ITenantContextService,

    @Inject(MULTI_TENANT_CONFIG_SERVICE)
    private readonly configService: IMultiTenantConfigService,
  ) {}

  async use(
    req: TenantFastifyRequest,
    reply: FastifyReply['raw'],
    done: (error?: Error) => void,
  ): Promise<void> {
    try {
      const tenantResolutionConfig =
        this.configService.getTenantResolutionConfig();
      const tenantId = await this.resolveTenantId(req, tenantResolutionConfig);

      // Use resolved tenant or fallback to default
      const finalTenantId = tenantId || tenantResolutionConfig.defaultTenant;

      if (finalTenantId) {
        this.setTenantContext(
          req,
          finalTenantId,
          tenantId ? tenantResolutionConfig.strategy : 'default',
        );

        reply.setHeader('X-Tenant-ID', finalTenantId || 'unknown');
        reply.setHeader(
          'X-Tenant-Schema',
          this.tenantContextService.getContext()?.tenantSchema || 'unknown',
        );
      } else {
        this.logger.debug(
          '[Fastify] No tenant found in request and no default tenant configured',
        );
      }
    } catch (error) {
      this.logger.error('[Fastify] Error resolving tenant context:', error);
    }
    done();
  }

  /**
   * Resolves tenant ID based on the configured strategy.
   * @param req - The Fastify request object
   * @param config - The tenant resolution configuration
   * @returns The resolved tenant ID or undefined
   */
  private async resolveTenantId(
    req: TenantFastifyRequest,
    config: TenantResolutionConfig,
  ): Promise<string | undefined> {
    switch (config.strategy) {
      case 'header': {
        return this.resolveFromHeader(req, config.headerName || 'x-tenant-id');
      }
      case 'subdomain': {
        return this.resolveFromSubdomain(req, 0);
      }
      case 'jwt': {
        return await this.resolveFromJWT(
          req,
          config.jwtClaimName || 'tenantId',
        );
      }
      case 'custom': {
        const adatedReq = this.adaptFastifyRequest(req);
        return config.customResolver?.(adatedReq);
      }
      default: {
        this.logger.warn(
          `[Fastify] Unknown tenant resolution strategy: ${config.strategy}`,
        );
        return undefined;
      }
    }
  }

  /**
   * Sets the tenant context and updates the request object.
   * @param req - The Fastify request object
   * @param tenantId - The tenant ID to set
   * @param source - The source of the tenant ID (strategy or 'default')
   */
  private setTenantContext(
    req: TenantFastifyRequest,
    tenantId: string,
    source: string,
  ): void {
    this.tenantContextService.setContext(tenantId);
    const context = this.tenantContextService.getContext();

    if (!context) {
      this.logger.warn(
        `[Fastify] Failed to set tenant context for tenant: ${tenantId}`,
      );
      return;
    }

    req.tenant = {
      id: context.tenantId,
      schema: context.tenantSchema,
    };

    const logMessage =
      source === 'default'
        ? `[Fastify] Using default tenant: ${tenantId}`
        : `[Fastify] Tenant resolved using ${source} strategy: ${tenantId}`;

    this.logger.debug(logMessage);
    this.logger.debug(
      `[Fastify] Tenant context set: ID=${context.tenantId}, Schema=${context.tenantSchema}`,
    );
  }

  /**
   * Resolve tenant ID from request header.
   * @param req - The Fastify request object.
   * @param headerName - The name of the header to check for tenant ID.
   * @returns The tenant ID if found, otherwise undefined.
   */
  private resolveFromHeader(
    req: FastifyRequest,
    headerName: string,
  ): string | undefined {
    const tenantId = req.headers[headerName.toLowerCase()] as string;
    return tenantId?.trim() || undefined;
  }

  /**
   * Resolve tenant ID from request subdomain.
   * @param req - The Fastify request object.
   * @param position - The position of the subdomain to use as tenant ID.
   * @returns The tenant ID if found, otherwise undefined.
   */
  private resolveFromSubdomain(
    req: FastifyRequest,
    position: number,
  ): string | undefined {
    const host = req.headers.host;
    if (!host) return undefined;

    const subdomains = host.split('.').slice(0, -2);
    return subdomains[position]?.trim() || undefined;
  }

  /**
   * Resolve tenant ID from request JWT.
   * @param req - The Fastify request object.
   * @param jwtField - The key in the JWT payload to use as tenant ID.
   * @returns The tenant ID if found, otherwise undefined.
   */
  private async resolveFromJWT(
    req: FastifyRequest,
    jwtField: string,
  ): Promise<string | undefined> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return undefined;

      const token = authHeader.slice(7);
      const payload = this.decodeJWTPayload(token);

      const tenantId = (payload as Record<string, unknown>)?.[
        jwtField
      ] as string;
      return tenantId?.trim() || undefined;
    } catch (error) {
      this.logger.debug('[Fastify] Error extracting tenant from JWT:', error);
      return undefined;
    }
  }

  /**
   * Decode JWT payload.
   * @param token - The JWT token to decode.
   * @returns The decoded payload if valid, otherwise undefined.
   */
  private decodeJWTPayload(token: string): unknown {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return undefined;

      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64url').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      this.logger.debug('[Fastify] Error decoding JWT payload:', error);
      return undefined;
    }
  }

  /**
   * Adapt Fastify request to Express-like format.
   * @param req - The Fastify request object.
   * @returns The adapted request object.
   */
  private adaptFastifyRequest(req: FastifyRequest): Record<string, unknown> {
    return {
      headers: req.headers,
      url: req.url,
      method: req.method,
      query: req.query,
      params: req.params,
      body: req.body,
      // Add Express-like methods for compatibility
      get: (headerName: string) => req.headers[headerName.toLowerCase()],
      header: (headerName: string) => req.headers[headerName.toLowerCase()],
    };
  }
}
