import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import {
  IMultiTenantConfigService,
  ITenantContextService,
  TenantResolutionConfig,
} from '../interface/tenant.interface';
import {
  ITenantMiddlewareExpress,
  TenantExpressRequest,
} from '../interface/tenant-middleware.interface';
import { MULTI_TENANT_CONFIG_SERVICE } from '../modules/service/multi-tenant-config.service';
import { TENANT_CONTEXT_SERVICE } from '../modules/service/tenant-context.service';

/**
 * Middleware to resolve tenant context from request headers, subdomain, or JWT.
 * If no tenant is found, sets the default tenant context if configured.
 */
@Injectable()
export class TenantResolverMiddleware
  implements NestMiddleware, ITenantMiddlewareExpress
{
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  constructor(
    @Inject(TENANT_CONTEXT_SERVICE)
    private readonly tenantContextService: ITenantContextService,

    @Inject(MULTI_TENANT_CONFIG_SERVICE)
    private readonly configService: IMultiTenantConfigService,
  ) {}

  async use(
    req: TenantExpressRequest,
    _res: Response,
    next: NextFunction,
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
      } else {
        this.logger.debug(
          '[Express] No tenant found in request and no default tenant configured',
        );
      }
    } catch (error) {
      this.logger.error('[Express] Error resolving tenant context:', error);
    }

    next();
  }

  /**
   * Resolves tenant ID based on the configured strategy.
   * @param req - The Express request object
   * @param config - The tenant resolution configuration
   * @returns The resolved tenant ID or undefined
   */
  private async resolveTenantId(
    req: TenantExpressRequest,
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
        return this.resolveFromJWT(req, config.jwtClaimName || 'tenantId');
      }

      case 'custom': {
        return config.customResolver?.(req);
      }

      default: {
        this.logger.warn(
          `[Express] Unknown tenant resolution strategy: ${config.strategy}`,
        );
        return undefined;
      }
    }
  }

  /**
   * Sets the tenant context and updates the request object.
   * @param req - The Express request object
   * @param tenantId - The tenant ID to set
   * @param source - The source of the tenant ID (strategy or 'default')
   */
  private setTenantContext(
    req: TenantExpressRequest,
    tenantId: string,
    source: string,
  ): void {
    this.tenantContextService.setContext(tenantId);
    const context = this.tenantContextService.getContext();

    if (!context) {
      this.logger.warn(
        `[Express] Failed to set tenant context for tenant: ${tenantId}`,
      );
      return;
    }

    req.tenant = {
      id: context.tenantId,
      schema: context.tenantSchema,
    };

    const logMessage =
      source === 'default'
        ? `[Express] Using default tenant: ${tenantId}`
        : `[Express] Tenant resolved using ${source} strategy: ${tenantId}`;

    this.logger.debug(logMessage);
    this.logger.debug(
      `[Express] Tenant context set: ID=${context.tenantId}, Schema=${context.tenantSchema}`,
    );
  }

  /**
   * Resolve tenant ID from request header.
   * @param req - The Express request object.
   * @param headerName - The name of the header to check for tenant ID.
   * @returns The tenant ID if found, otherwise undefined.
   */
  private resolveFromHeader(
    req: Request,
    headerName: string,
  ): string | undefined {
    const tenantId = req.headers[headerName.toLowerCase()] as string;
    return tenantId?.trim() || undefined;
  }

  /**
   * Resolve tenant ID from request subdomain.
   * @param req - The Express request object.
   * @param position - The position of the subdomain to use as tenant ID.
   * @returns The tenant ID if found, otherwise undefined.
   */
  private resolveFromSubdomain(
    req: Request,
    position: number,
  ): string | undefined {
    const host = req.get('host');
    if (!host) return undefined;

    const subdomains = host.split('.').slice(0, -2);
    return subdomains[position]?.trim() || undefined;
  }

  /**
   * Resolve tenant ID from request JWT.
   * @param req - The Express request object.
   * @param jwtKey - The key in the JWT payload to use as tenant ID.
   * @returns The tenant ID if found, otherwise undefined.
   */
  private async resolveFromJWT(
    req: Request,
    jwtKey: string,
  ): Promise<string | undefined> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return undefined;

      const token = authHeader.slice(7);
      const payload = this.decodeJWTPayload(token);

      const tenantId = (payload as Record<string, unknown>)?.[jwtKey] as string;
      return tenantId?.trim() || undefined;
    } catch (error) {
      this.logger.debug('[Express] Error resolving tenant from JWT:', error);
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
      this.logger.debug('[Express] Error decoding JWT payload:', error);
      return undefined;
    }
  }
}
