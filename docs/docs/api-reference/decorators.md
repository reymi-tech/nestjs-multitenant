---
sidebar_position: 3
title: Decorators
---

# Decorators

The NestJS Multitenant package provides decorators for dependency injection that are tailored to your chosen ORM. Choose the decorators that match your ORM configuration.

## Drizzle ORM Decorators (Recommended)

### @InjectTenantDb()

Injects a tenant-scoped Drizzle NodePgDatabase instance for direct database access.

**Signature:**

```typescript
@InjectTenantDb()
```

**Usage:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectTenantDb } from 'nestjs-multitenant';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tasks } from '../schemas/task.schema';

@Injectable()
export class TasksService {
  constructor(@InjectTenantDb() private db: NodePgDatabase<typeof tasks>) {}

  async findAll() {
    return await this.db.select().from(tasks);
  }

  async create(taskData: NewTask) {
    const result = await this.db.insert(tasks).values(taskData).returning();
    return result[0];
  }
}
```

**Benefits:**

- ✅ Direct database access with full Drizzle type safety
- ✅ Automatic tenant context handling
- ✅ Access to all Drizzle query methods
- ✅ Superior TypeScript support

### @InjectTenantDbFactory()

Injects a factory function to create Drizzle database connections for specific tenants.

**Signature:**

```typescript
@InjectTenantDbFactory()
```

**Usage:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectTenantDbFactory } from 'nestjs-multitenant';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class CustomService {
  constructor(
    @InjectTenantDbFactory()
    private dbFactory: (tenantId: string) => Promise<NodePgDatabase>,
  ) {}

  async runForSpecificTenant(tenantId: string) {
    const db = await this.dbFactory(tenantId);
    // Use db for specific tenant operations
  }
}
```

## TypeORM Decorators (Default)

### @InjectTenantRepository()

Injects a tenant-scoped TypeORM repository.

**Signature:**

```typescript
@InjectTenantRepository(entityClass: any)
```

**Usage:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectTenantRepository } from 'nestjs-multitenant';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectTenantRepository(Task) private taskRepository: Repository<Task>,
  ) {}

  async findAll(): Promise<Task[]> {
    return await this.taskRepository.find();
  }

  async create(taskData: Partial<Task>): Promise<Task> {
    const task = this.taskRepository.create(taskData);
    return await this.taskRepository.save(task);
  }
}
```

### @InjectTenantDataSource()

Injects a tenant-scoped TypeORM DataSource.

**Signature:**

```typescript
@InjectTenantDataSource()
```

**Usage:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectTenantDataSource } from 'nestjs-multitenant';
import { DataSource } from 'typeorm';

@Injectable()
export class CustomService {
  constructor(@InjectTenantDataSource() private dataSource: DataSource) {}

  async getRepository() {
    return this.dataSource.getRepository(Task);
  }

  async runQuery() {
    return await this.dataSource.query('SELECT * FROM tasks');
  }
}
```

### @InjectTenantRepositoryFactory()

Injects a factory function to get repositories for specific tenants.

**Signature:**

```typescript
@InjectTenantRepositoryFactory()
```

**Usage:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectTenantRepositoryFactory } from 'nestjs-multitenant';
import { Repository } from 'typeorm';

@Injectable()
export class CustomService {
  constructor(
    @InjectTenantRepositoryFactory()
    private repoFactory: (
      entityClass: any,
      tenantId: string,
    ) => Repository<any>,
  ) {}

  async getTaskRepositoryForTenant(
    tenantId: string,
  ): Promise<Repository<Task>> {
    return this.repoFactory(Task, tenantId);
  }
}
```

## ORM Selection Guide

| Decorator                   | Drizzle ORM | TypeORM | Recommended For                                           |
| --------------------------- | ----------- | ------- | --------------------------------------------------------- |
| `@InjectTenantDb()`         | ✅          | ❌      | **New projects** - Direct DB access with full type safety |
| `@InjectTenantRepository()` | ❌          | ✅      | Existing TypeORM projects                                 |
| `@InjectTenantDbFactory()`  | ✅          | ❌      | Advanced use cases needing specific tenant control        |
| `@InjectTenantDataSource()` | ❌          | ✅      | TypeORM advanced use cases                                |

## Best Practices

### For Drizzle ORM

1. **Use TypeScript types**: Leverage Drizzle's inferred types
2. **Schema registration**: Ensure all schemas are registered in module configuration
3. **Query building**: Use Drizzle's query builder for type safety

### For TypeORM

1. **Entity registration**: Ensure all entities are registered with EntityRegistry
2. **Repository patterns**: Follow TypeORM repository patterns
3. **Relations**: Use TypeORM decorators for entity relationships

## Migration Between ORMs

When migrating from TypeORM to Drizzle:

```typescript
// Before (TypeORM)
@InjectTenantRepository(Task)
private taskRepository: Repository<Task>;

// After (Drizzle)
@InjectTenantDb()
private db: NodePgDatabase<typeof tasks>;
```

See our [TypeORM to Drizzle Migration Guide](/docs/migration-guides/from-typeorm-to-drizzle) for detailed migration steps.
