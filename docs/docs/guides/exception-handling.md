---
sidebar_position: 5
title: Exception Handling
description: Comprehensive exception handling for multi-tenant applications
---

# Exception Handling

The `nestjs-multitenant` package provides a comprehensive exception handling system with structured error responses, custom error classes, and support for both Express and Fastify adapters.

## Overview

The exception handling system consists of:

- **MultitenantExceptionFilter**: Global exception filter that catches all errors
- **Custom Error Classes**: Domain-specific error classes
- **ErrorTypeMapper**: Maps different error types to standardized responses
- **StructuredLogger**: JSON-structured logging with context

## Installation

The exception handling is included in the main package. No additional installation required:

```bash
npm install nestjs-multitenant
```

## Quick Setup

### 1. Register Globally

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MultitenantExceptionFilter } from 'nestjs-multitenant';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register the exception filter globally
  app.useGlobalFilters(new MultitenantExceptionFilter());

  await app.listen(3000);
}
bootstrap();
```

### 2. Register via Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MultitenantExceptionFilter } from 'nestjs-multitenant';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: MultitenantExceptionFilter,
    },
  ],
})
export class AppModule {}
```

## Custom Error Classes

The package provides domain-specific custom error classes:

```typescript
import {
  NoTenantContextError,
  InvalidTenantCodeError,
  SchemaNotFoundError,
  TenantValidationError,
  TenantConflictError,
  ConnectionPoolExhaustedError,
  InvalidConnectionTypeError,
  TransactionFailedError,
} from 'nestjs-multitenant';
```

### Usage Examples

```typescript
@Injectable()
export class TenantService {
  async createTenant(tenantCode: string) {
    // Throw when tenant context is required but not available
    if (!this.hasTenantContext()) {
      throw new NoTenantContextError(
        'Tenant context required for this operation',
      );
    }

    // Throw when tenant code is invalid
    if (!this.isValidTenantCode(tenantCode)) {
      throw new InvalidTenantCodeError(tenantCode);
    }

    // Throw when schema doesn't exist
    if (!(await this.schemaExists(tenantCode))) {
      throw new SchemaNotFoundError(tenantCode);
    }

    // Throw on validation failures
    const errors = this.validateTenantData(data);
    if (errors.length > 0) {
      throw new TenantValidationError(errors);
    }

    // Throw on conflict (tenant already exists)
    if (await this.tenantExists(tenantCode)) {
      throw new TenantConflictError(tenantCode);
    }
  }
}
```

### Error Class Reference

| Error Class                    | HTTP Status | Use Case                  |
| ------------------------------ | ----------- | ------------------------- |
| `NoTenantContextError`         | 400         | Missing tenant context    |
| `InvalidTenantCodeError`       | 404         | Invalid tenant identifier |
| `SchemaNotFoundError`          | 404         | Tenant schema not found   |
| `TenantValidationError`        | 400         | Validation failed         |
| `TenantConflictError`          | 409         | Tenant already exists     |
| `ConnectionPoolExhaustedError` | 503         | Pool exhausted            |
| `InvalidConnectionTypeError`   | 400         | Invalid connection type   |
| `TransactionFailedError`       | 500         | Transaction failed        |

## Structured Error Responses

All errors return a consistent JSON format:

```json
{
  "success": false,
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "Tenant schema not found",
    "category": "TENANT",
    "statusCode": 404,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "traceId": "mt_1705315800000_abc123def",
    "details": {
      "tenant": {
        "invalidCode": "unknown_tenant"
      }
    },
    "request": {
      "method": "GET",
      "url": "/api/users",
      "tenantCode": "unknown_tenant"
    }
  }
}
```

### Response Fields

| Field              | Type    | Description                 |
| ------------------ | ------- | --------------------------- |
| `success`          | boolean | Always `false` for errors   |
| `error.code`       | string  | Machine-readable error code |
| `error.message`    | string  | Human-readable message      |
| `error.category`   | string  | Error category              |
| `error.statusCode` | number  | HTTP status code            |
| `error.timestamp`  | string  | ISO timestamp               |
| `error.traceId`    | string  | Unique trace ID             |
| `error.details`    | object  | Additional error details    |
| `error.request`    | object  | Request context             |

### Error Categories

- **DATABASE**: TypeORM and Drizzle errors (PostgreSQL)
- **TENANT**: Tenant-specific errors
- **CONNECTION**: Connection and pool errors
- **VALIDATION**: Data validation errors
- **SYSTEM**: Internal server errors

## Database Error Mapping

The filter automatically maps database errors:

```typescript
// These PostgreSQL errors are automatically mapped:
- 23505: Unique constraint violation (409)
- 23503: Foreign key violation (400)
- 23502: Not null violation (400)
- 23514: Check constraint violation (400)
- 40001: Serialization failure (409)
- 08006: Connection failure (503)
- 53300: Pool exhausted (503)
- 42P01: Undefined table (404)
```

## Response Headers

The filter adds correlation headers:

```http
X-Trace-ID: mt_1705315800000_abc123def
X-Tenant-Code: tenant1
```

## Logging

The `StructuredLogger` provides JSON-formatted logging:

```typescript
import { StructuredLogger, LogContext } from 'nestjs-multitenant';

const logger = new StructuredLogger();
const context: LogContext = {
  traceId: 'mt_1705315800000_abc123def',
  tenantCode: 'tenant1',
  method: 'GET',
  url: '/api/users',
  timestamp: new Date().toISOString(),
};

// Log errors with full context
logger.logError(error, context, {
  error: {
    name: error.name,
    message: error.message,
    category: 'TENANT',
    errorCode: 'SCHEMA_NOT_FOUND',
    statusCode: 404,
  },
  tenant: {
    code: 'tenant1',
  },
});
```

## Integration with NestJS Exceptions

The filter handles standard NestJS exceptions:

```typescript
// These are also handled automatically
throw new NotFoundException('Resource not found');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Unauthorized');
throw new ForbiddenException('Forbidden');
throw new ConflictException('Conflict');
```

## Suppress Sensitive Information

System errors are sanitized to prevent information disclosure:

```typescript
// This returns a generic message
throw new Error('Database connection string: postgres://secret...');

// Response:
// {
//   "success": false,
//   "error": {
//     "code": "INTERNAL_SERVER_ERROR",
//     "message": "An internal server error occurred. Please try again later.",
//     "category": "SYSTEM",
//     ...
//   }
// }
```

## Fastify Support

The filter automatically detects and supports Fastify:

```typescript
// No additional configuration needed
// The filter uses type guards to detect the adapter

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  app.useGlobalFilters(new MultitenantExceptionFilter());
  await app.listen(3000);
}
```

## Next Steps

- [API Reference - Exception Filter](/docs/api-reference/interfaces)
- [Troubleshooting Guide](/docs/advanced/troubleshooting)
- [Monitoring & Logging](/docs/advanced/monitoring)
