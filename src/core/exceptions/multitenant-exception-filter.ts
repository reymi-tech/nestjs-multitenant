import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
// Import custom errors
import { DrizzleQueryError } from 'drizzle-orm';
import { TypeORMError } from 'typeorm';

import {
  ErrorDetails,
  ErrorResponse,
} from '../interfaces/error-response.interface';
import {
  ConnectionPoolExhaustedError,
  InvalidConnectionTypeError,
  InvalidTenantCodeError,
  NoTenantContextError,
  SchemaNotFoundError,
  TenantConflictError,
  TenantValidationError,
  TransactionFailedError,
} from './custom-errors';
import { ErrorMapping, ErrorTypeMapper } from './error-type-mapper';
import { SupportedRequest } from './structured-logger';
import { LogContext, LogMetadata, StructuredLogger } from './structured-logger';

// Type guards for Express and Fastify
interface ExpressResponse {
  setHeader(name: string, value: string): ExpressResponse;
  status(code: number): ExpressResponse & { json(data: ErrorResponse): void };
  json(data: ErrorResponse): void;
}

interface FastifyResponse {
  header(name: string, value: string): FastifyResponse;
  code(code: number): FastifyResponse;
  send(data: ErrorResponse): void;
}

interface ExpressRequest {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  connection?: {
    remoteAddress?: string;
  };
}

interface FastifyRequest {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  ip?: string;
  ips?: string[];
  socket?: {
    remoteAddress?: string;
  };
}

@Injectable()
@Catch()
export class MultitenantExceptionFilter implements ExceptionFilter {
  private readonly structuredLogger = new StructuredLogger();

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ExpressResponse | FastifyResponse>();
    const request = ctx.getRequest<ExpressRequest | FastifyRequest>();

    // Convert request to SupportedRequest type for the logger
    const supportedRequest = this.convertToSupportedRequest(request);
    const context =
      this.structuredLogger.extractContextFromRequest(supportedRequest);
    const errorResponse = this.buildErrorResponse(exception, context);

    // Set trace ID in response headers for client correlation
    this.setResponseHeader(response, 'X-Trace-ID', context.traceId);
    if (context.tenantCode) {
      this.setResponseHeader(response, 'X-Tenant-Code', context.tenantCode);
    }

    // Log the error with full context
    this.logError(exception, context, errorResponse);

    // Send standardized error response
    this.sendResponse(response, errorResponse.error.statusCode, errorResponse);
  }

  private convertToSupportedRequest(
    request: ExpressRequest | FastifyRequest,
  ): SupportedRequest {
    return request as SupportedRequest;
  }

  private setResponseHeader(
    response: ExpressResponse | FastifyResponse,
    name: string,
    value: string,
  ): void {
    if (this.isExpressResponse(response)) {
      response.setHeader(name, value);
    } else {
      // Fastify response
      response.header(name, value);
    }
  }

  private sendResponse(
    response: ExpressResponse | FastifyResponse,
    statusCode: number,
    data: ErrorResponse,
  ): void {
    if (this.isExpressResponse(response)) {
      response.status(statusCode).json(data);
    } else {
      // Fastify response
      response.code(statusCode).send(data);
    }
  }

  private isExpressResponse(
    response: ExpressResponse | FastifyResponse,
  ): response is ExpressResponse {
    return (
      'setHeader' in response && 'status' in response && 'json' in response
    );
  }

  private buildErrorResponse(
    exception: unknown,
    context: LogContext,
  ): ErrorResponse {
    let errorMapping: ErrorMapping;
    let originalError: Error;

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      errorMapping = ErrorTypeMapper.mapNestJSHttpError(exception);
      originalError = exception as Error;
    }
    // Handle custom tenant errors
    else if (
      exception instanceof NoTenantContextError ||
      exception instanceof InvalidTenantCodeError ||
      exception instanceof SchemaNotFoundError ||
      exception instanceof ConnectionPoolExhaustedError ||
      exception instanceof InvalidConnectionTypeError ||
      exception instanceof TenantValidationError ||
      exception instanceof TenantConflictError ||
      exception instanceof TransactionFailedError
    ) {
      errorMapping = ErrorTypeMapper.mapTenantError(exception);
      originalError = exception;
    }
    // Handle TypeORM errors
    else if (exception instanceof TypeORMError) {
      errorMapping = ErrorTypeMapper.mapDatabaseError(exception);
      originalError = exception;
    } else if (exception instanceof DrizzleQueryError) {
      errorMapping = ErrorTypeMapper.mapDatabaseError(exception);
      originalError = exception;
    }
    // Handle Drizzle errors and other database errors
    else if (exception instanceof Error) {
      const isDatabaseError =
        exception.message?.includes('connection') ||
        exception.message?.includes('timeout') ||
        exception.message?.includes('database') ||
        exception.message?.includes('query') ||
        exception.message?.includes('schema') ||
        exception.message?.includes('pool');

      errorMapping = isDatabaseError
        ? ErrorTypeMapper.mapDatabaseError(exception)
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            errorCode: 'INTERNAL_SERVER_ERROR',
            category: 'SYSTEM',
          };

      originalError = exception;
    }
    // Handle unknown error types
    else {
      errorMapping = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        errorCode: 'UNKNOWN_ERROR',
        category: 'SYSTEM',
      };
      originalError = new Error('Unknown error occurred');
    }

    // Build the standardized error response
    return {
      success: false,
      error: {
        code: errorMapping.errorCode,
        message: this.sanitizeErrorMessage(
          errorMapping.message,
          errorMapping.category,
        ),
        category: errorMapping.category,
        statusCode: errorMapping.statusCode,
        timestamp: new Date().toISOString(),
        traceId: context.traceId,
        details: this.extractErrorDetails(originalError, errorMapping),
        request: {
          method: context.method || 'UNKNOWN',
          url: context.url || 'UNKNOWN',
          tenantCode: context.tenantCode,
        },
      },
    };
  }

  private extractErrorDetails(
    error: Error,
    mapping: ErrorMapping,
  ): ErrorDetails | undefined {
    const details: ErrorDetails = {};

    // Include specific error details based on category
    if (mapping.category === 'DATABASE') {
      if (error.name === 'QueryFailedError') {
        const queryFailedError = error as unknown as {
          query?: string;
          parameters?: unknown[];
          driverError?: unknown;
        };
        details.databaseError = {
          query: queryFailedError.query,
          parameters: queryFailedError.parameters,
          driverError: this.sanitizeDriverError(queryFailedError.driverError),
        };
      }
      if (error.name === 'EntityNotFoundError') {
        const entityNotFoundError = error as unknown as {
          entityName?: string;
          entityId?: string | number;
        };
        details.entity = {
          entityName: entityNotFoundError.entityName,
          entityId: entityNotFoundError.entityId,
        };
      }
    }

    if (mapping.category === 'TENANT') {
      if (error instanceof InvalidTenantCodeError) {
        details.tenant = {
          invalidCode: error.tenantCode,
        };
      }
      if (error instanceof TenantValidationError) {
        details.tenant = {
          validationErrors: error.validationErrors,
        };
      }
      if (error instanceof TenantConflictError) {
        details.tenant = {
          conflictingCode: error.tenantCode,
        };
      }
    }

    if (
      mapping.category === 'CONNECTION' &&
      error instanceof ConnectionPoolExhaustedError
    ) {
      details.connection = {
        tenantCode: error.tenantCode,
        suggestion:
          'Retry after a few seconds or reduce concurrent connections',
      };
    }

    return Object.keys(details).length > 0 ? details : undefined;
  }

  private sanitizeDriverError(
    driverError: unknown,
  ):
    | { code?: string; severity?: string; detail?: string; hint?: string }
    | undefined {
    if (!driverError) return undefined;

    const err = driverError as {
      code?: string;
      severity?: string;
      detail?: string;
      hint?: string;
    };
    return {
      code: err.code,
      severity: err.severity,
      detail: err.detail,
      hint: err.hint,
    };
  }

  private sanitizeErrorMessage(message: string, category: string): string {
    // For system errors, provide a generic message to avoid information disclosure
    if (category === 'SYSTEM') {
      return 'An internal server error occurred. Please try again later.';
    }
    return message;
  }

  private logError(
    exception: unknown,
    context: LogContext,
    errorResponse: ErrorResponse,
  ): void {
    const error =
      exception instanceof Error ? exception : new Error('Unknown error');
    const metadata: LogMetadata = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        category: errorResponse.error.category,
        errorCode: errorResponse.error.code,
        statusCode: errorResponse.error.statusCode,
      },
      database: errorResponse.error.details?.database,
      tenant: errorResponse.error.details?.tenant,
    };

    // For high-severity errors, add additional context
    if (errorResponse.error.statusCode >= 500) {
      metadata.performance = {
        memoryUsage: process.memoryUsage(),
      };
    }

    this.structuredLogger.logError(error, context, metadata);
  }
}
