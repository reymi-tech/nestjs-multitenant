---
sidebar_position: 2
title: Services
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Services

The NestJS Multitenant package provides services that are tailored to your chosen ORM configuration. Services are automatically injected based on your ORM selection.

## Core Services (Available for all ORMs)

### TenantConnectionService

Manages database connections per tenant with ORM-agnostic interface.

**Key Methods:**

```typescript
// Get connection for current tenant
async getConnection(): Promise<IOrmConnection>

// Get connection for specific tenant
async getConnectionForTenant(tenantId: string): Promise<IOrmConnection>

// Close connection for tenant
async closeConnection(tenantId: string): Promise<void>
```

**Usage:**

```typescript
constructor(private connectionService: TenantConnectionService) {}

async performTenantOperation() {
  const connection = await this.connectionService.getConnection();
  // Use connection for operations
}
```

### TenantContextService

Manages tenant context throughout request lifecycle.

**Key Methods:**

```typescript
// Get current tenant ID
getCurrentTenantId(): string

// Get current tenant data
getCurrentTenant(): Tenant

// Get tenant by ID
getTenantById(tenantId: string): Promise<Tenant>

// Set tenant context
setTenant(tenant: Tenant): void
```

### MultiTenantConfigService

Access to module configuration.

**Key Methods:**

```typescript
// Get database configuration
getDatabaseConfig(): DatabaseConfig

// Get ORM configuration
getOrmConfig(): OrmConfig

// Get platform configuration
getPlatformConfig(): PlatformConfig
```

## Drizzle ORM Services (Recommended)

### DrizzleTenantAdminService

CRUD operations for tenant management using Drizzle ORM.

**Key Methods:**

```typescript
// Create new tenant
createTenant(createTenantDto: CreateTenantDto): Promise<Tenant>

// List all tenants
listTenants(filterDto?: ListTenantDto): Promise<PageDto<Tenant>>

// Get tenant by ID
getTenantById(tenantId: string): Promise<Tenant>

// Update tenant
updateTenant(tenantId: string, updateTenantDto: UpdateTenantDto): Promise<Tenant>

// Delete tenant
deleteTenant(tenantId: string): Promise<void>

// Get tenant statistics
getTenantStatistics(tenantId: string): Promise<TenantStatistics>

// Suspend/activate tenant
suspendTenant(tenantId: string): Promise<Tenant>
activateTenant(tenantId: string): Promise<Tenant>
```

**Usage Example:**

```typescript
import { Injectable } from '@nestjs/common';
import { DrizzleTenantAdminService } from 'nestjs-multitenant';
import { CreateTenantDto } from '../dto/tenant.dto';

@Injectable()
export class CustomTenantService {
  constructor(private tenantAdminService: DrizzleTenantAdminService) {}

  async createTenant(createDto: CreateTenantDto) {
    return await this.tenantAdminService.createTenant(createDto);
  }
}
```

### AdminDatabaseProvider

Provides Drizzle database connection for administrative operations.

**Usage:**

```typescript
import { Injectable } from '@nestjs/common';
import { AdminDatabaseProvider } from 'nestjs-multitenant';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class AdminService {
  constructor(private adminDbProvider: AdminDatabaseProvider) {}

  async runAdminQuery() {
    const db = await this.adminDbProvider.getConnection();
    // Perform admin operations
  }
}
```

## TypeORM Services (Default)

### TenantAdminService

CRUD operations for tenant management using TypeORM.

**Key Methods:**

```typescript
// Create new tenant
createTenant(createTenantDto: CreateTenantDto): Promise<Tenant>

// List all tenants
listTenants(filterDto?: ListTenantDto): Promise<PageDto<Tenant>>

// Get tenant by ID
getTenantById(tenantId: string): Promise<Tenant>

// Update tenant
updateTenant(tenantId: string, updateTenantDto: UpdateTenantDto): Promise<Tenant>

// Delete tenant
deleteTenant(tenantId: string): Promise<void>
```

**Usage Example:**

```typescript
import { Injectable } from '@nestjs/common';
import { TenantAdminService } from 'nestjs-multitenant';
import { CreateTenantDto } from '../dto/tenant.dto';

@Injectable()
export class CustomTenantService {
  constructor(private tenantAdminService: TenantAdminService) {}

  async createTenant(createDto: CreateTenantDto) {
    return await this.tenantAdminService.createTenant(createDto);
  }
}
```

## Service Selection Matrix

| Service                     | Drizzle ORM | TypeORM | Description                           |
| --------------------------- | ----------- | ------- | ------------------------------------- |
| `TenantConnectionService`   | ✅          | ✅      | Core connection management            |
| `TenantContextService`      | ✅          | ✅      | Tenant context handling               |
| `DrizzleTenantAdminService` | ✅          | ❌      | **Drizzle-specific** admin operations |
| `TenantAdminService`        | ❌          | ✅      | **TypeORM-specific** admin operations |
| `AdminDatabaseProvider`     | ✅          | ❌      | **Drizzle-specific** admin DB access  |
| `MultiTenantConfigService`  | ✅          | ✅      | Configuration access                  |

## Automatic Service Injection

Services are automatically injected based on your ORM configuration:

```typescript
// In your module configuration
MultiTenantModule.forRoot({
  // ...
  orm: {
    type: 'drizzle', // or 'typeorm'
  },
});

// Services are automatically available:
// - If type: 'drizzle' → DrizzleTenantAdminService is injected
// - If type: 'typeorm' → TenantAdminService is injected
// - Core services available regardless
```

## Custom Service Implementation

You can extend or replace default services:

<Tabs>
  <TabItem value="drizzle" label="Custom Drizzle Service">

```typescript
import { Injectable } from '@nestjs/common';
import { DrizzleTenantAdminService } from 'nestjs-multitenant';

@Injectable()
export class CustomDrizzleTenantService extends DrizzleTenantAdminService {
  async createTenantWithDefaults(createDto: CreateTenantDto) {
    const tenant = await super.createTenant(createDto);

    // Add custom logic
    await this.setupDefaultData(tenant.id);

    return tenant;
  }

  private async setupDefaultData(tenantId: string) {
    // Custom setup logic for new tenant
  }
}
```

  </TabItem>
  <TabItem value="typeorm" label="Custom TypeORM Service">

```typescript
import { Injectable } from '@nestjs/common';
import { TenantAdminService } from 'nestjs-multitenant';

@Injectable()
export class CustomTypeOrmTenantService extends TenantAdminService {
  async createTenantWithDefaults(createDto: CreateTenantDto) {
    const tenant = await super.createTenant(createDto);

    // Add custom logic
    await this.setupDefaultData(tenant.id);

    return tenant;
  }

  private async setupDefaultData(tenantId: string) {
    // Custom setup logic for new tenant
  }
}
```

  </TabItem>
</Tabs>

## Best Practices

### For Drizzle ORM Services

1. **Type Safety**: Leverage Drizzle's inferred types
2. **Schema Updates**: Keep admin schema in sync with tenant schemas
3. **Connection Pooling**: Monitor connection pool performance

### For TypeORM Services

1. **Entity Relations**: Use TypeORM relations for complex queries
2. **Migration Scripts**: Maintain admin database migrations
3. **Repository Patterns**: Follow repository pattern best practices

### Cross-ORM Considerations

1. **Service Interfaces**: Design services to be ORM-agnostic when possible
2. **Configuration Management**: Use MultiTenantConfigService for dynamic settings
3. **Error Handling**: Handle ORM-specific errors gracefully

## Performance Monitoring

Use TenantConnectionService to monitor performance:

```typescript
@Injectable()
export class PerformanceMonitorService {
  constructor(private connectionService: TenantConnectionService) {}

  async getConnectionMetrics() {
    // Monitor connection pool usage
    // Track query performance
    // Analyze tenant-specific patterns
  }
}
```
