import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

import {
  IMultiTenantConfigService,
  ITenantContextService,
} from '../modules/interface/tenant.interface';
import {
  ITenantMiddlewareFastify,
  TenantFastifyRequest,
} from '../modules/interface/tenant-middleware.interface';
import { MULTI_TENANT_CONFIG_SERVICE } from '../modules/service/multi-tenant-config.service';
import { TENANT_CONTEXT_SERVICE } from '../modules/service/tenant-context.service';

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
      let tenantId: string | undefined = undefined;

      switch (tenantResolutionConfig.strategy) {
        case 'header': {
          tenantId = this.resolveFromHeader(
            req,
            tenantResolutionConfig.headerName || 'x-tenant-id',
          );
          break;
        }
        case 'subdomain': {
          tenantId = this.resolveFromSubdomain(req, 0);
          break;
        }
        case 'jwt': {
          tenantId = await this.resolveFromJWT(
            req,
            tenantResolutionConfig.jwtClaimName || 'tenantId',
          );
          break;
        }
        case 'custom': {
          if (tenantResolutionConfig.customResolver) {
            const adatedReq = this.adaptFastifyRequest(req);
            tenantId = tenantResolutionConfig.customResolver(adatedReq);
          }
          break;
        }
        default: {
          throw new Error(
            `[Fastify] Unknown tenant resolution strategy: ${tenantResolutionConfig.strategy}`,
          );
        }
      }

      if (tenantId) {
        this.logger.debug(
          `[Fastify] Tenant resolved using ${tenantResolutionConfig.strategy} strategy: ${tenantId}`,
        );
      }

      // Set tenant context
      this.logger.debug(
        `[Fastify] Setting tenant context for request: ${tenantId}`,
      );

      if (tenantId) {
        this.tenantContextService.setContext(tenantId);
        const context = this.tenantContextService.getContext();
        if (context) {
          req.tenant = {
            id: context.tenantId,
            schema: context.tenantSchema,
          };

          // Add Tenant headers to response
          reply.setHeader('X-Tenant-ID', context.tenantId || 'unknown');
          reply.setHeader('X-Tenant-Schema', context.tenantSchema || 'unknown');

          this.logger.debug(
            `[Fastify] Tenant context set: ID=${context.tenantId}, Schema=${context.tenantSchema}`,
          );
        } else {
          // Default tenant context
          const defaultTenant = tenantResolutionConfig.defaultTenant;
          if (defaultTenant) {
            this.tenantContextService.setContext(defaultTenant);
            const context = this.tenantContextService.getContext();

            if (context) {
              req.tenant = {
                id: context.tenantId,
                schema: context.tenantSchema,
              };

              reply.setHeader('X-Tenant-ID', context.tenantId || 'unknown');
              reply.setHeader(
                'X-Tenant-Schema',
                context.tenantSchema || 'unknown',
              );

              this.logger.debug(
                `[Fastify] Default tenant context set: ID=${context.tenantId}, Schema=${context.tenantSchema}`,
              );
            }
          } else {
            // If no default tenant and no tenant found, log debug message
            this.logger.debug(
              '[Fastify] No tenant found in request and no default tenant configured',
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('[Fastify] Error resolving tenant context:', error);
    }
    done();
  }

  /**
   * Resolve tenant ID from request header.
   * @param req - The Fastify request object.
   * @param headerName - The name of the header to check for tenant ID.
   * @returns The tenant ID if found, otherwise null.
   */
  private resolveFromHeader(
    req: FastifyRequest,
    headerName: string,
  ): string | undefined {
    const tenantId = req.headers[headerName.toLowerCase()] as string;
    return tenantId || undefined;
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

    const subdomains = host.split('.').slice(0, -2); // Remove domain and TLD
    return subdomains[position] || undefined;
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
      if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;

      const token = authHeader.slice(7);

      // Basic JWT payload extraction (without verification)
      // In production, you should verify the JWT signature
      const payload = this.decodeJWTPayload(token);

      return (
        ((payload as Record<string, unknown>)?.[jwtField] as string) ||
        undefined
      );
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
