import { NextFunction, Request, Response } from 'express';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Extended Express request with tenant information
 */
export interface TenantExpressRequest extends Request {
  tenant?: {
    id: string | undefined;
    schema: string | undefined;
  };
}

/**
 * Extended Fastify request with tenant information
 */
export interface TenantFastifyRequest extends FastifyRequest {
  tenant?: {
    id: string | undefined;
    schema: string | undefined;
  };
}

/**
 * Tenant middleware interface for Express
 */
export interface ITenantMiddlewareExpress {
  use?(
    req: TenantExpressRequest,
    res: Response,
    next: NextFunction,
  ): void | Promise<void>;
}

/**
 * Tenant middleware interface for Fastify
 */
export interface ITenantMiddlewareFastify {
  use?(
    req: TenantFastifyRequest,
    reply: FastifyReply['raw'],
    done: (error?: Error) => void,
  ): void | Promise<void>;
}
