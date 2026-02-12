import { Injectable, Logger, LoggerService } from '@nestjs/common';

// Union type for Express and Fastify requests
interface BaseRequest {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
}

interface ExpressRequestLike extends BaseRequest {
  headers: Record<string, string | string[] | undefined>;
  connection?: {
    remoteAddress?: string;
  };
}

interface FastifyRequestLike extends BaseRequest {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  ips?: string[];
  socket?: {
    remoteAddress?: string;
  };
}

export type SupportedRequest = ExpressRequestLike | FastifyRequestLike;

export interface LogContext {
  traceId: string;
  tenantCode?: string;
  userId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  timestamp: string;
}

export interface LogMetadata {
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: string;
    category: string;
    errorCode: string;
    statusCode: number;
  };
  performance?: {
    duration?: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
  database?: {
    operation?: string;
    table?: string;
    schema?: string;
  };
  tenant?: {
    code?: string;
    schema?: string;
    connectionType?: string;
  };
}

@Injectable()
export class StructuredLogger implements LoggerService {
  private readonly logger = new (Logger ||
    class {
      error(msg: string) {
        console.error('[ERROR]', msg);
      }
      warn(msg: string) {
        console.warn('[WARN]', msg);
      }
      log(msg: string) {
        console.log('[INFO]', msg);
      }
      debug(msg: string) {
        console.debug('[DEBUG]', msg);
      }
      verbose(msg: string) {
        console.log('[VERBOSE]', msg);
      }
    })('Multitenant');

  generateTraceId(): string {
    return `mt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  extractContextFromRequest(request: SupportedRequest): LogContext {
    // Helper function to safely get header values
    const getHeader = (name: string): string | undefined => {
      const headerValue = request.headers[name.toLowerCase()];
      if (Array.isArray(headerValue)) {
        return headerValue[0];
      }
      return (headerValue as string) || undefined;
    };

    const traceId = getHeader('x-trace-id') || this.generateTraceId();
    const userAgent = getHeader('user-agent') || '';
    const forwarded = getHeader('x-forwarded-for');

    // Extract IP based on request type (Express vs Fastify)
    let ip: string | undefined;

    if (this.isFastifyRequest(request)) {
      // Fastify: request.ip or request.ips
      ip =
        request.ip ||
        (request.ips && request.ips[0]) ||
        request.socket?.remoteAddress;
    } else {
      // Express: check x-forwarded-for first, then connection.remoteAddress
      ip = forwarded
        ? forwarded.split(',')[0].trim()
        : (request as ExpressRequestLike).connection?.remoteAddress;
    }

    return {
      traceId,
      tenantCode: getHeader('x-tenant-code'),
      userId: getHeader('x-user-id'),
      requestId: getHeader('x-request-id'),
      userAgent,
      ip,
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    };
  }

  private isFastifyRequest(
    request: SupportedRequest,
  ): request is FastifyRequestLike {
    return 'ip' in request && 'raw' in request;
  }

  logError(error: Error, context: LogContext, metadata?: LogMetadata): void {
    const logEntry = {
      level: 'ERROR',
      traceId: context.traceId,
      tenantCode: context.tenantCode,
      userId: context.userId,
      requestId: context.requestId,
      timestamp: context.timestamp,
      userAgent: context.userAgent,
      ip: context.ip,
      method: context.method,
      url: context.url,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        category: metadata?.error?.category || 'UNKNOWN',
        errorCode: metadata?.error?.errorCode || 'UNKNOWN_ERROR',
        statusCode: metadata?.error?.statusCode || 500,
      },
      metadata: {
        performance: metadata?.performance,
        database: metadata?.database,
        tenant: metadata?.tenant,
      },
    };

    this.logger.error(JSON.stringify(logEntry, undefined, 2));
  }

  logWarning(
    message: string,
    context: LogContext,
    metadata?: LogMetadata,
  ): void {
    const logEntry = {
      level: 'WARN',
      traceId: context.traceId,
      tenantCode: context.tenantCode,
      userId: context.userId,
      requestId: context.requestId,
      timestamp: context.timestamp,
      message,
      metadata: {
        performance: metadata?.performance,
        database: metadata?.database,
        tenant: metadata?.tenant,
      },
    };

    this.logger.warn(JSON.stringify(logEntry, undefined, 2));
  }

  logInfo(message: string, context: LogContext, metadata?: LogMetadata): void {
    const logEntry = {
      level: 'INFO',
      traceId: context.traceId,
      tenantCode: context.tenantCode,
      userId: context.userId,
      requestId: context.requestId,
      timestamp: context.timestamp,
      message,
      metadata: {
        performance: metadata?.performance,
        database: metadata?.database,
        tenant: metadata?.tenant,
      },
    };

    this.logger.log(JSON.stringify(logEntry, undefined, 2));
  }

  logDebug(message: string, context: LogContext, metadata?: LogMetadata): void {
    const logEntry = {
      level: 'DEBUG',
      traceId: context.traceId,
      tenantCode: context.tenantCode,
      userId: context.userId,
      requestId: context.requestId,
      timestamp: context.timestamp,
      message,
      metadata: {
        performance: metadata?.performance,
        database: metadata?.database,
        tenant: metadata?.tenant,
      },
    };

    this.logger.debug(JSON.stringify(logEntry, undefined, 2));
  }

  // LoggerService interface implementation
  log(message: unknown, context?: string): void {
    this.logger.log(String(message), context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error(String(message), trace, context);
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn(String(message), context);
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug(String(message), context);
  }

  verbose(message: unknown, context?: string): void {
    this.logger.verbose(String(message), context);
  }
}
