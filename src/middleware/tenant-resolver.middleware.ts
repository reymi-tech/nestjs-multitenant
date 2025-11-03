import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import {
  IMultiTenantConfigService,
  ITenantContextService,
} from '../modules/interface/tenant.interface';
import {
  ITenantMiddlewareExpress,
  TenantExpressRequest,
} from '../modules/interface/tenant-middleware.interface';
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

  async use(req: TenantExpressRequest, _res: Response, next: NextFunction) {
    try {
      const tenantResolutionConfig =
        this.configService.getTenantResolutionConfig();
      let tenantId: string | undefined;

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
            tenantId = tenantResolutionConfig.customResolver(req);
          }
          break;
        }
        default: {
          this.logger.warn(
            `[Express] Unknown tenant resolution strategy: ${tenantResolutionConfig.strategy}`,
          );
        }
      }

      if (tenantId) {
        this.logger.debug(
          `[Express] Tenant resolved using ${tenantResolutionConfig.strategy} strategy: ${tenantId}`,
        );
      }

      this.logger.debug(
        `[Express] Setting tenant context for request: ${tenantId}`,
      );

      // Set tenant context
      if (tenantId) {
        this.tenantContextService.setContext(tenantId);
        const context = this.tenantContextService.getContext();

        if (context) {
          req.tenant = {
            id: context.tenantId,
            schema: context.tenantSchema,
          };

          this.logger.debug(
            `[Express] Tenant context set: ID=${context.tenantId}, Schema=${context.tenantSchema}`,
          );
        }
      } else {
        // Set default tenant context
        const defaultTenant = tenantResolutionConfig.defaultTenant;
        if (defaultTenant) {
          this.tenantContextService.setContext(defaultTenant);
          const context = this.tenantContextService.getContext();
          if (context) {
            req.tenant = {
              id: context.tenantId,
              schema: context.tenantSchema,
            };
          }
          this.logger.debug(
            `[Express] Default tenant context set: ID=${context.tenantId}, Schema=${context.tenantSchema}`,
          );
        } else {
          this.logger.warn(
            '[Express] No tenant found in request and no default tenant configured',
          );
        }
      }
    } catch (error) {
      this.logger.error('[Express] Error resolving tenant context:', error);
    }

    next();
  }

  /**
   * Resolve tenant ID from request header.
   * @param req - The Express request object.
   * @param headerName - The name of the header to check for tenant ID.
   * @returns The tenant ID if found, otherwise null.
   */
  private resolveFromHeader(
    req: Request,
    headerName: string,
  ): string | undefined {
    const tenantId = req.headers[headerName.toLowerCase()] as string;
    return tenantId || undefined;
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
    const host = req.get('host') as string;
    if (!host) return undefined;

    const subdomains = host.split('.').slice(0, -2);
    return subdomains[position] || undefined;
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
      if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;

      const token = authHeader.slice(7);

      const payload = this.decodeJWTPayload(token);
      return (
        ((payload as Record<string, unknown>)?.[jwtKey] as string) || undefined
      );
    } catch (error) {
      this.logger.error('[Express] Error resolving tenant from JWT:', error);
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
      this.logger.error('[Express] Error verifying JWT:', error);
      return undefined;
    }
  }
}
