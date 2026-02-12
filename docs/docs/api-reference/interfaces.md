---
sidebar_position: 4
title: Interfaces
---

# Interfaces

The NestJS Multitenant package provides comprehensive TypeScript interfaces that are tailored to your chosen ORM. The ORM abstraction layer ensures type safety while allowing flexibility between TypeORM and Drizzle.

## ORM Abstraction Interfaces

### IOrmConnection

Base interface for all ORM connections.

```typescript
interface IOrmConnection {
  type: 'typeorm' | 'drizzle';
  getTenantId(): string;
  getDatabase(): any; // TypeORM DataSource or Drizzle NodePgDatabase
  close(): Promise<void>;
  isConnected(): boolean;
}
```

### IOrmStrategy

Strategy interface for ORM-specific operations.

```typescript
interface IOrmStrategy {
  type: 'typeorm' | 'drizzle';
  createConnection(tenantId: string): Promise<IOrmConnection>;
  validateConnection(connection: IOrmConnection): boolean;
  closeConnection(connection: IOrmConnection): Promise<void>;
}
```

### OrmConfig

Configuration interface for ORM selection and options.

```typescript
interface OrmConfig {
  type: 'typeorm' | 'drizzle';
  drizzle?: {
    schema: Record<string, any>; // Drizzle schema objects
    logger?: boolean;
    ssl?: boolean | object;
  };
  typeorm?: {
    autoLoadEntities?: boolean;
    synchronize?: boolean;
    logging?: boolean;
    ssl?: boolean | object;
    retryAttempts?: number;
    retryDelay?: number;
  };
}
```

## Drizzle ORM Specific Interfaces

### IDrizzleConnection

Drizzle-specific connection interface.

```typescript
interface IDrizzleConnection extends IOrmConnection {
  type: 'drizzle';
  getDatabase(): NodePgDatabase<any>;
  getSchema(): Record<string, any>;
}
```

### DrizzleConnectionOptions

Options for Drizzle database connections.

```typescript
interface DrizzleConnectionOptions {
  schema: Record<string, any>;
  logger?: boolean;
  ssl?: boolean | object;
}
```

## TypeORM Specific Interfaces

### ITypeOrmConnection

TypeORM-specific connection interface.

```typescript
interface ITypeOrmConnection extends IOrmConnection {
  type: 'typeorm';
  getDatabase(): DataSource;
  getRepository<Entity>(entityClass: any): Repository<Entity>;
}
```

### TypeOrmConnectionOptions

Options for TypeORM database connections.

```typescript
interface TypeOrmConnectionOptions {
  autoLoadEntities?: boolean;
  synchronize?: boolean;
  logging?: boolean;
  ssl?: boolean | object;
  retryAttempts?: number;
  retryDelay?: number;
}
```

## Core Module Interfaces

### MultiTenantModuleOptions

Main configuration interface for the multi-tenant module.

```typescript
interface MultiTenantModuleOptions {
  // Database configuration
  database: DatabaseConfig;

  // ORM configuration
  orm?: OrmConfig; // Defaults to TypeORM for backward compatibility

  // Platform configuration
  platform: 'express' | 'fastify';

  // Schema management
  autoCreateSchemas?: boolean;

  // Admin module
  enableAdminModule?: boolean;

  // Tenant resolution
  tenantResolution?: TenantResolutionConfig;

  // Validation strategies
  validationStrategies?: ValidationStrategyConfig[];

  // Custom providers and controllers
  customProviders?: Provider[];
  customControllers?: ClassConstructor<any>[];
}
```

### DatabaseConfig

Database connection configuration.

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | object;
}
```

### TenantResolutionConfig

Configuration for tenant resolution strategies.

```typescript
interface TenantResolutionConfig {
  strategy: 'header' | 'subdomain' | 'query' | 'custom';
  headerName?: string; // For header strategy
  queryParam?: string; // For query strategy
  subdomainSeparator?: string; // For subdomain strategy
  customProvider?: Provider; // For custom strategy
}
```

## Tenant Management Interfaces

### ITenant

Core tenant entity interface.

```typescript
interface ITenant {
  id: string;
  name: string;
  domain?: string;
  subdomain?: string;
  database: string;
  schema: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateTenantDto

Data transfer object for creating tenants.

```typescript
interface CreateTenantDto {
  name: string;
  domain?: string;
  subdomain?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}
```

### UpdateTenantDto

Data transfer object for updating tenants.

```typescript
interface UpdateTenantDto {
  name?: string;
  domain?: string;
  subdomain?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}
```

### ListTenantDto

Data transfer object for listing tenants.

```typescript
interface ListTenantDto {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Validation Strategy Interfaces

### ValidationStrategyConfig

Configuration for validation strategies.

```typescript
interface ValidationStrategyConfig {
  strategy: string;
  provider: Provider;
  enabled: boolean;
  options?: Record<string, any>;
}
```

### TenantValidationResult

Result of tenant validation.

```typescript
interface TenantValidationResult {
  isValid: boolean;
  tenant?: ITenant;
  error?: string;
  metadata?: Record<string, any>;
}
```

## Utility Type Guards

### isTypeOrmConnection

Type guard for TypeORM connections.

```typescript
function isTypeOrmConnection(
  connection: IOrmConnection,
): connection is ITypeOrmConnection {
  return connection.type === 'typeorm';
}
```

### isDrizzleConnection

Type guard for Drizzle connections.

```typescript
function isDrizzleConnection(
  connection: IOrmConnection,
): connection is IDrizzleConnection {
  return connection.type === 'drizzle';
}
```

## Example Usage

### Using Type Guards

```typescript
@Injectable()
export class ConnectionService {
  async performOperation(connection: IOrmConnection) {
    if (isDrizzleConnection(connection)) {
      const db = connection.getDatabase(); // NodePgDatabase
      await db.select().from(tasks);
    }

    if (isTypeOrmConnection(connection)) {
      const dataSource = connection.getDatabase(); // DataSource
      const repo = dataSource.getRepository(Task);
      await repo.find();
    }
  }
}
```

### Configuration Usage

```typescript
const config: MultiTenantModuleOptions = {
  database: {
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'multitenant_db',
  },
  orm: {
    type: 'drizzle', // or 'typeorm'
    drizzle: {
      schema: { users, tasks },
      logger: true,
    },
  },
  platform: 'express',
  autoCreateSchemas: true,
  tenantResolution: {
    strategy: 'header',
    headerName: 'x-tenant-id',
  },
};
```

## Migration Between Interfaces

When migrating from TypeORM to Drizzle:

```typescript
// Before (TypeORM)
interface IConnection {
  getDataSource(): DataSource;
}

// After (Drizzle - with type safety)
const connection: IDrizzleConnection = ...;
const db = connection.getDatabase(); // Fully typed NodePgDatabase
```

## Best Practices

### For Type Safety

1. **Use Type Guards**: Always use type guards before ORM-specific operations
2. **Leverage Generics**: Use TypeScript generics for flexible, type-safe code
3. **Validate Configuration**: Ensure configuration interfaces match your ORM choice

### For Flexibility

1. **ORM-Agnostic Design**: Design services to work with `IOrmConnection` when possible
2. **Conditional Logic**: Use type guards for ORM-specific optimizations
3. **Configuration Validation**: Validate `OrmConfig` before module initialization

### For Maintenance

1. **Interface Documentation**: Keep interface documentation updated
2. **Version Compatibility**: Track interface changes between versions
3. **Type Migration**: Use migration guides when updating interfaces
