---
sidebar_position: 4
title: Tenant Validation
description: Learn about the different strategies for validating tenants in your application
---

# Tenant Validation

Tenant validation is a critical step in the request lifecycle. It ensures that the resolved tenant identifier (e.g., from a subdomain or header) corresponds to a valid, active tenant in your system before processing the request.

`nestjs-multitenant` provides a flexible validation system with built-in strategies and support for custom implementations.

## Available Strategies

The module supports three validation strategies out of the box:

### 1. Local Strategy (Default)

The `local` strategy checks for the tenant's existence directly in your application's database using the `Tenant` entity. This is the simplest approach and works best for monolithic applications or when the tenant service is part of the same application.

**How it works:**

1.  The middleware resolves a tenant ID.
2.  The strategy queries the `Tenant` repository.
3.  If found, the tenant context is set. If not, a 404/403 error is thrown.

**Configuration:**

```typescript
MultiTenantModule.forRoot({
  // ... other options
  validationStrategy: 'local', // Default, explicitly stated here
});
```

### 2. Remote Strategy

The `remote` strategy delegates validation to an external service via an HTTP request. This is ideal for microservices architectures where a central "Tenant Service" manages tenant data.

**How it works:**

1.  The middleware resolves a tenant ID.
2.  The strategy makes a GET request to `${remoteServiceUrl}/tenants/validate/${tenantId}`.
3.  The service expects a boolean response or a specific payload confirming existence.

**Configuration:**

```typescript
MultiTenantModule.forRoot({
  // ... other options
  validationStrategy: 'remote',
  remoteServiceUrl: 'http://tenant-service/api', // URL of your validation service
  // Required: Import HttpModule from @nestjs/axios
});
```

### 3. Custom Strategy

If you have unique validation requirements (e.g., checking a Redis cache, validating against a different database type, or complex business logic), you can implement your own strategy.

**Implementation:**

Create a class that implements the `ITenantValidationStrategy` interface:

```typescript
import { Injectable } from '@nestjs/common';
import { ITenantValidationStrategy, Tenant } from 'nestjs-multitenant';

@Injectable()
export class MyCustomValidationStrategy implements ITenantValidationStrategy {
  async validateTenantExists(tenantCode: string): Promise<boolean> {
    // Your custom logic here
    const exists = await checkMyCache(tenantCode);
    return exists;
  }

  async findByCode(code: string): Promise<Tenant | undefined> {
    // Return the tenant object or undefined
    return fetchTenantFromMySource(code);
  }
}
```

**Configuration:**

```typescript
MultiTenantModule.forRoot({
  // ... other options
  validationStrategy: 'custom',
  customProviders: [
    {
      provide: 'TENANT_VALIDATION_STRATEGY', // Use the exported symbol if available
      useClass: MyCustomValidationStrategy,
    },
  ],
});
```

## Choosing a Strategy

| Strategy   | Best For                              | Pros                                  | Cons                                            |
| :--------- | :------------------------------------ | :------------------------------------ | :---------------------------------------------- |
| **Local**  | Monoliths, single DB instance         | Fast, no network overhead, easy setup | Tightly coupled to local DB                     |
| **Remote** | Microservices, distributed systems    | Decoupled, centralized management     | Network latency, dependency on external service |
| **Custom** | specialized needs (Cache, LDAP, etc.) | Complete control                      | Requires implementation effort                  |
