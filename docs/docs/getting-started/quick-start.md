---
sidebar_position: 2
title: Quick Start
description: Build your first multi-tenant NestJS application in 5 minutes
---

# Quick Start

Get a working multi-tenant application up and running in less than 5 minutes. This guide walks you through creating a simple multi-tenant task management API.

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

```bash
npm install nestjs-multitenant @nestjs/config @nestjs/typeorm typeorm pg class-transformer class-validator
```

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

## Step 4: Create Your Entity

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

## Step 5: Register Entities

Create `src/entities/index.ts`:

```typescript title="src/entities/index.ts"
import { EntityRegistry } from 'nestjs-multitenant';
import { Task } from './task.entity';

// Register entities before module initialization
EntityRegistry.getInstance().registerEntity('Task', Task);

export { Task };
```

## Step 6: Configure the App Module

Update `src/app.module.ts`:

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

    // Configure multi-tenancy
    MultiTenantModule.forRoot({
      database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        synchronize: true, // Only for development!
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

## Next Steps

- Learn about [Configuration Options](/docs/getting-started/configuration)
- Explore [Tenant Resolution Strategies](/docs/guides/tenant-resolution)
- Add [Authentication](/docs/examples/with-authentication)
