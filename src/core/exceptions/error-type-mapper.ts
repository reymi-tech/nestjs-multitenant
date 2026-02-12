import { HttpStatus } from '@nestjs/common';

export interface ErrorMapping {
  statusCode: number;
  message: string;
  errorCode: string;
  category: 'DATABASE' | 'TENANT' | 'CONNECTION' | 'VALIDATION' | 'SYSTEM';
}

interface TypeORMError {
  name?: string;
  driverError?: { code?: string };
}

interface HttpErrorLike {
  getStatus?: () => number;
  statusCode?: number;
  getResponse?: () => unknown;
  message?: string;
}

export class ErrorTypeMapper {
  static mapDatabaseError(error: unknown): ErrorMapping {
    const pgErrorCodes: Record<string, ErrorMapping> = {
      '23505': {
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource already exists (unique constraint violation)',
        errorCode: 'UNIQUE_VIOLATION',
        category: 'DATABASE',
      },
      '23503': {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Referenced resource does not exist (foreign key violation)',
        errorCode: 'FOREIGN_KEY_VIOLATION',
        category: 'DATABASE',
      },
      '23502': {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Required field is missing (not null violation)',
        errorCode: 'NOT_NULL_VIOLATION',
        category: 'DATABASE',
      },
      '23514': {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Data does not satisfy check constraint',
        errorCode: 'CHECK_VIOLATION',
        category: 'DATABASE',
      },
      '40001': {
        statusCode: HttpStatus.CONFLICT,
        message: 'Concurrent modification detected, please retry',
        errorCode: 'SERIALIZATION_FAILURE',
        category: 'DATABASE',
      },
      '08006': {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection failed',
        errorCode: 'CONNECTION_FAILURE',
        category: 'CONNECTION',
      },
      '08001': {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Unable to connect to database',
        errorCode: 'SQLCLIENT_UNABLE_TO_ESTABLISH_SQLCONNECTION',
        category: 'CONNECTION',
      },
      '53300': {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection pool exhausted',
        errorCode: 'TOO_MANY_CONNECTIONS',
        category: 'CONNECTION',
      },
      '42P01': {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Database schema or table does not exist',
        errorCode: 'UNDEFINED_TABLE',
        category: 'DATABASE',
      },
    };

    if (!error || typeof error !== 'object') {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        errorCode: 'DATABASE_ERROR',
        category: 'DATABASE',
      };
    }

    const dbError = error as TypeORMError & {
      message?: string;
      cause?: { code?: string };
    };
    const errorName = dbError.name;
    const errorMessage = dbError.message ?? '';

    if (errorName === 'QueryFailedError') {
      const pgCode = dbError.driverError?.code;
      if (pgCode && pgErrorCodes[pgCode]) {
        return pgErrorCodes[pgCode];
      }
    }

    if (errorName === 'EntityNotFoundError') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Requested resource not found',
        errorCode: 'ENTITY_NOT_FOUND',
        category: 'DATABASE',
      };
    }

    if (
      errorName === 'CannotConnectDatabaseError' ||
      errorName === 'CannotExecuteNotConnectedError'
    ) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection unavailable',
        errorCode: 'CONNECTION_ERROR',
        category: 'CONNECTION',
      };
    }

    if (
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')
    ) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database service temporarily unavailable',
        errorCode: 'DATABASE_SERVICE_ERROR',
        category: 'CONNECTION',
      };
    }

    if (errorMessage.includes('query')) {
      const pgCode = dbError.cause?.code;
      if (pgCode && pgErrorCodes[pgCode]) {
        return pgErrorCodes[pgCode];
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
      errorCode: 'DATABASE_ERROR',
      category: 'DATABASE',
    };
  }

  static mapTenantError(error: unknown): ErrorMapping {
    if (!error || typeof error !== 'object') {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Tenant operation failed',
        errorCode: 'TENANT_ERROR',
        category: 'TENANT',
      };
    }

    const err = error as { name?: string };
    const errorName = err.name ?? '';

    const tenantErrorMappings: Record<string, ErrorMapping> = {
      NoTenantContextError: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Tenant context is required for this operation',
        errorCode: 'MISSING_TENANT_CONTEXT',
        category: 'TENANT',
      },
      InvalidTenantCodeError: {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Invalid tenant identifier',
        errorCode: 'INVALID_TENANT',
        category: 'TENANT',
      },
      SchemaNotFoundError: {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Tenant schema not found',
        errorCode: 'SCHEMA_NOT_FOUND',
        category: 'TENANT',
      },
      ConnectionPoolExhaustedError: {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Tenant connection pool temporarily unavailable',
        errorCode: 'CONNECTION_POOL_EXHAUSTED',
        category: 'CONNECTION',
      },
      InvalidConnectionTypeError: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid database connection type',
        errorCode: 'INVALID_CONNECTION_TYPE',
        category: 'CONNECTION',
      },
      TenantValidationError: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Tenant validation failed',
        errorCode: 'TENANT_VALIDATION_ERROR',
        category: 'VALIDATION',
      },
      TenantConflictError: {
        statusCode: HttpStatus.CONFLICT,
        message: 'Tenant already exists',
        errorCode: 'TENANT_CONFLICT',
        category: 'TENANT',
      },
      TransactionFailedError: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database transaction failed',
        errorCode: 'TRANSACTION_FAILED',
        category: 'DATABASE',
      },
    };

    return (
      tenantErrorMappings[errorName] || {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Tenant operation failed',
        errorCode: 'TENANT_ERROR',
        category: 'TENANT',
      }
    );
  }

  static mapNestJSHttpError(error: unknown): ErrorMapping {
    if (!error || typeof error !== 'object') {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_SERVER_ERROR',
        category: 'SYSTEM',
      };
    }

    const httpError = error as HttpErrorLike;
    const statusCode =
      httpError.getStatus?.() ??
      httpError.statusCode ??
      HttpStatus.INTERNAL_SERVER_ERROR;
    const response = httpError.getResponse?.();

    let message = httpError.message ?? 'An unexpected error occurred';
    if (response && typeof response === 'object') {
      const resp = response as { message?: unknown; error?: unknown };
      if (resp.message) {
        message = typeof resp.message === 'string' ? resp.message : message;
      } else if (resp.error) {
        message = typeof resp.error === 'string' ? resp.error : message;
      }
    }

    return {
      statusCode,
      message: Array.isArray(message) ? message.join(', ') : message,
      errorCode: this.getErrorCodeFromStatus(statusCode),
      category: this.getCategoryFromStatus(statusCode),
    };
  }

  private static getErrorCodeFromStatus(statusCode: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    return codes[statusCode] || 'UNKNOWN_ERROR';
  }

  private static getCategoryFromStatus(
    statusCode: number,
  ): 'DATABASE' | 'TENANT' | 'CONNECTION' | 'VALIDATION' | 'SYSTEM' {
    if (statusCode >= 500) return 'SYSTEM';
    if (statusCode === 409) return 'VALIDATION';
    if ([400, 422].includes(statusCode)) return 'VALIDATION';
    if ([401, 403].includes(statusCode)) return 'TENANT';
    if ([404].includes(statusCode)) return 'TENANT';
    if ([502, 503, 504].includes(statusCode)) return 'CONNECTION';
    return 'SYSTEM';
  }
}
