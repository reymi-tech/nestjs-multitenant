---
sidebar_position: 2
title: Quick Start
description: Build your first multi-tenant NestJS application in 5 minutes
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quick Start

Get a working multi-tenant application up and running in less than 5 minutes. This guide walks you through creating a simple multi-tenant task management API using your preferred ORM.

## What You'll Build

A task management API where each tenant has their own isolated tasks, with:

- Automatic tenant resolution from HTTP headers
- Tenant-specific database schemas
- Full CRUD operations for tasks
- Admin endpoints for tenant management

## Step 1: Create a New NestJS Project

```bash
npm i -g @nestjs/cli
nest new my-multitenant-app
cd my-multitenant-app
```

## Step 2: Install Dependencies

Choose your ORM:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM (Recommended)">

```bash
npm install nestjs-multitenant @nestjs/config drizzle-orm pg class-transformer class-validator
npm install -D drizzle-kit @types/pg
```

  </TabItem>
  <TabItem value="typeorm" label="TypeORM (Default)">

```bash
npm install nestjs-multitenant @nestjs/config @nestjs/typeorm typeorm pg class-transformer class-validator
```

  </TabItem>
</Tabs>

## Step 3: Configure Environment Variables

Create a `.env` file in the root:

```env title=".env"
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=multitenant_db
TENANT_HEADER=x-tenant-id
```

## Step 4: Create Your Entity/Schema

Choose your ORM approach:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM Schema">

Create `src/schemas/task.schema.ts`:

```typescript title="src/schemas/task.schema.ts"
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

  </TabItem>
  <TabItem value="typeorm" label="TypeORM Entity">

Create `src/entities/task.entity.ts`:

```typescript title="src/entities/task.entity.ts"
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

  </TabItem>
</Tabs>

## Step 5: Register Entities/Schemas

Choose your ORM approach:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM Schema Registration">

Create `src/schemas/index.ts`:

```typescript title="src/schemas/index.ts"
import { tasks } from './task.schema';

// Export all schemas for module configuration
export const schema = { tasks };

// Export types for use in services
export type { Task, NewTask } from './task.schema';
```

  </TabItem>
  <TabItem value="typeorm" label="TypeORM Entity Registration">

Create `src/entities/index.ts`:

```typescript title="src/entities/index.ts"
import { EntityRegistry } from 'nestjs-multitenant';
import { Task } from './task.entity';

// Register entities before module initialization
EntityRegistry.getInstance().registerEntity('Task', Task);

export { Task };
```

  </TabItem>
</Tabs>

## Step 6: Configure the App Module

Update `src/app.module.ts`:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM Configuration">

```typescript title="src/app.module.ts"
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MultiTenantModule } from 'nestjs-multitenant';
import { schema } from './schemas'; // Import schemas
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    // Must be first!
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Configure multi-tenancy with Drizzle
    MultiTenantModule.forRoot({
      database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },
      orm: {
        type: 'drizzle',
        drizzle: {
          schema, // Pass your schemas here
          logger: true, // Enable query logging
        },
      },
      platform: 'express',
      autoCreateSchemas: true,
      enableAdminModule: true,
      tenantResolution: {
        strategy: 'header',
        headerName: 'x-tenant-id',
      },
    }),

    TasksModule,
  ],
})
export class AppModule {}
```

  </TabItem>
  <TabItem value="typeorm" label="TypeORM Configuration">

```typescript title="src/app.module.ts"
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MultiTenantModule } from 'nestjs-multitenant';
import './entities'; // Import to register entities
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    // Must be first!
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Configure multi-tenancy with TypeORM
    MultiTenantModule.forRoot({
      database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },
      orm: {
        type: 'typeorm',
        typeorm: {
          synchronize: true, // Only for development!
          logging: true,
        },
      },
      platform: 'express',
      autoCreateSchemas: true,
      enableAdminModule: true,
      tenantResolution: {
        strategy: 'header',
        headerName: 'x-tenant-id',
      },
    }),

    TasksModule,
  ],
})
export class AppModule {}
```

  </TabItem>
</Tabs>

## Next Steps

- Learn about [Configuration Options](/docs/getting-started/configuration)
- Explore [Tenant Resolution Strategies](/docs/guides/tenant-resolution)
- Add [Authentication](/docs/examples/with-authentication)
