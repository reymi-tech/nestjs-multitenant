---
sidebar_position: 3
title: Migrations
description: Manage database migrations across tenants
---

# Migrations

Learn how to manage database schema changes across multiple tenants.

## TypeORM Migrations

### Generate Migration

```bash
npm run typeorm migration:generate -- -n AddUserEmail
```

### Run Migrations for All Tenants

```typescript
import { TenantConnectionService } from 'nestjs-multitenant';

async function runMigrationsForAllTenants() {
  const tenants = await tenantService.findAll();

  for (const tenant of tenants) {
    const connection = await connectionService.getConnectionForSchema(
      tenant.code,
    );
    await connection.runMigrations();
    console.log(`Migrations applied for tenant: ${tenant.code}`);
  }
}
```

## Schema Synchronization

For development only:

```typescript
MultiTenantModule.forRoot({
  database: {
    synchronize: true, // Only in development!
  },
});
```

:::warning
Never use `synchronize: true` in production. Use migrations instead.
:::

## Next Steps

- Set up [Testing](/docs/guides/testing)
- Learn about [Performance](/docs/advanced/performance)
