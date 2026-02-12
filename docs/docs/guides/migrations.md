---
sidebar_position: 3
title: Migrations
description: Manage database migrations across tenants
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migrations

Learn how to manage database schema changes across multiple tenants.

## Overview

The `nestjs-multitenant` package has different migration approaches depending on the ORM you choose:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM">

  - ✅ **Internal Admin Migrations**: Automatic migrations for the admin schema tenant
  - ✅ **Manual Tenant Migrations**: Full control over your tenant schemas
  - ✅ **Schema-per-tenant Pattern**: Explicit schema naming with prefix

  </TabItem>
  <TabItem value="typeorm" label="TypeORM">

  - ✅ **Automatic Synchronization**: Built-in schema sync for development
  - ✅ **Traditional Migrations**: TypeORM's migration system
  - ⚠️ **No Internal Admin Migrations**: Manual admin schema setup required

  </TabItem>
</Tabs>

---

## Drizzle ORM Migrations

### Internal Admin Migrations

The module includes **internal migrations** specifically for the admin schema tenant. These migrations are:

- **Only available for Drizzle ORM** (TypeORM doesn't need them due to auto-sync)
- **Automatically executed** when the admin module is enabled
- **Controlled by environment variable**: `MULTITENANT_RUN_ADMIN_MIGRATIONS`

```env
# Environment variable to control admin migrations
MULTITENANT_RUN_ADMIN_MIGRATIONS=true  # Default: true
```

:::note
The internal admin migrations create the necessary schema structure for tenant management, including the `tenants` table and related indexes.
:::

### Schema-per-Tenant Pattern

For your own tenant schemas, you must follow Drizzle's schema naming convention. Each tenant needs its own schema with the `tenant_` prefix:

```typescript
import {
  pgSchema,
  pgTable,
  uuid,
  varchar,
  sql,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Helper function to create prefixed schemas
const prefixSchema = (schema: string) => pgSchema(`tenant_${schema}`);

// Company 1 Schema
export const company1Schema = prefixSchema('company1');

export const users = company1Schema.table(
  'users',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
  },
  table => [uniqueIndex('users_email_unique').on(table.email)],
);

// Company 2 Schema
export const company2Schema = prefixSchema('company2');

export const company2Users = company2Schema.table(
  'users',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
  },
  table => [uniqueIndex('users_email_unique').on(table.email)],
);
```

### Generate Migrations with Drizzle Kit

Create a `drizzle.config.ts` file in your project root:

```typescript title="drizzle.config.ts"
import { defineConfig } from 'drizzle-kit';
import { company1Schema, company2Schema } from './src/database/schemas';

export default defineConfig({
  schema: ['./src/database/schemas/**/*.ts'],
  out: './drizzle', // Migration output directory
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

Generate migrations:

```bash
# Generate migrations for all schemas
pnpm drizzle-kit generate

# Generate for specific schema (if needed)
pnpm drizzle-kit generate --config=drizzle.config.ts
```

### Run Migrations for Your Schemas

After generating migrations, you need to apply them manually:

<Tabs>
  <TabItem value="development" label="Development">

```bash
# Run migrations using drizzle-kit
pnpm drizzle-kit migrate

# Or run programmatically
pnpm tsx scripts/run-migrations.ts
```

  </TabItem>
  <TabItem value="programmatic" label="Programmatic">

Create a migration script:

```typescript title="scripts/run-migrations.ts"
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
```

  </TabItem>
</Tabs>

### Run Migrations for All Tenants

To migrate all existing tenant schemas:

```typescript
import { TenantConnectionService } from 'nestjs-multitenant';

async function runMigrationsForAllTenants() {
  // Get all tenants from the admin database
  const tenants = await tenantService.findAll();

  for (const tenant of tenants) {
    try {
      const connection = await connectionService.getConnectionForSchema(
        `tenant_${tenant.code}`, // Note the tenant_ prefix
      );

      // Apply migrations for this tenant
      await connection.runMigrations();
      console.log(`✅ Migrations applied for tenant: ${tenant.code}`);
    } catch (error) {
      console.error(`❌ Failed to migrate tenant ${tenant.code}:`, error);
    }
  }
}
```

---

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

### Schema Synchronization

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

---

## Migration Best Practices

### Development Workflow

1. **Make Schema Changes**: Update your Drizzle schema files
2. **Generate Migration**: `pnpm drizzle-kit generate`
3. **Review Migration**: Check the generated SQL in `./drizzle/`
4. **Test Locally**: Apply migrations to your local database
5. **Deploy**: Apply migrations to production using your deployment pipeline

### Production Considerations

```typescript
// Always backup before migrations
async function safeMigration(tenantId: string) {
  try {
    // 1. Create backup
    await createBackup(tenantId);

    // 2. Apply migration
    await applyMigration(tenantId);

    // 3. Verify schema
    await verifySchema(tenantId);
  } catch (error) {
    // 4. Rollback if needed
    await restoreBackup(tenantId);
    throw error;
  }
}
```

### Migration Naming Convention

```typescript
// Good migration names
AddUserProfileTable;
CreateUserIndexes;
UpdateUserEmailConstraints;

// Avoid generic names
UpdateSchema;
FixStuff;
TempChanges;
```

---

## Troubleshooting

### "Migrations folder not found"

**Solution**: Ensure your drizzle config points to the correct migration folder:

```typescript
// drizzle.config.ts
export default defineConfig({
  out: './drizzle', // Must match this folder structure
  // ... other config
});
```

### "Schema tenant_company1 does not exist"

**Solution**: Ensure you're using the `tenant_` prefix correctly:

```typescript
// ✅ Correct - with tenant_ prefix
const schema = pgSchema(`tenant_${tenantCode}`);

// ❌ Incorrect - missing prefix
const schema = pgSchema(tenantCode);
```

### Migration Permissions

**Solution**: Ensure your database user has schema creation permissions:

```sql
GRANT CREATE ON DATABASE multitenant_db TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
```

## Next Steps

- Set up [Testing](/docs/guides/testing)
- Learn about [Performance](/docs/advanced/performance)
- Understand [Entity Registry](/docs/core-concepts/entity-registry)
