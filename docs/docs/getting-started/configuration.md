---
sidebar_position: 3
title: Configuration
description: Configure nestjs-multitenant for your application
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Configuration

Comprehensive guide to configuring the MultiTenantModule for your specific needs.

## Basic Configuration (forRoot)

Choose your ORM configuration below:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM (Recommended)">

```typescript
import { Module } from '@nestjs/common';
import { MultiTenantModule } from 'nestjs-multitenant';
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

// Define your Drizzle schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

@Module({
  imports: [
    MultiTenantModule.forRoot({
      database: {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'multitenant_db',
      },
      orm: {
        type: 'drizzle',
        drizzle: {
          schema: { users },
          logger: true,
        },
      },
      platform: 'express',
      autoCreateSchemas: true,
      enableAdminModule: true,
    }),
  ],
})
export class AppModule {}
```

  </TabItem>
  <TabItem value="typeorm" label="TypeORM (Default)">

```typescript
import { Module } from '@nestjs/common';
import { MultiTenantModule } from 'nestjs-multitenant';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;
}

@Module({
  imports: [
    MultiTenantModule.forRoot({
      database: {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'multitenant_db',
      },
      orm: {
        type: 'typeorm',
        typeorm: {
          autoLoadEntities: true,
          synchronize: true,
          logging: true,
        },
      },
      platform: 'express',
      autoCreateSchemas: true,
      enableAdminModule: true,
    }),
  ],
})
export class AppModule {}
```

  </TabItem>
</Tabs>

## forRootAsync Configuration

El método `buildAsyncConfig()` simplifica drásticamente la configuración asíncrona al manejar automáticamente la configuración específica del ORM y la configuración de admin.

<Tabs
groupId="async-examples"
defaultValue="typeorm-default"
values={[
{ label: 'TypeORM + Admin Default', value: 'typeorm-default' },
{ label: 'TypeORM + Custom Controller', value: 'typeorm-custom' },
{ label: 'Drizzle + Custom Controller', value: 'drizzle-custom' },
]}

>   <TabItem value="typeorm-default">

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MultiTenantModule,
  createDatabaseConfigFromEnv,
} from 'nestjs-multitenant';

@Module({
  imports: [
    // ⚠️ IMPORTANTE: ConfigModule debe importarse ANTES que MultiTenantModule
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión principal de la aplicación
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'multitenant_db',
      schema: 'public',
      synchronize: true,
    }),

    // Configuración asíncrona con admin controller por defecto
    MultiTenantModule.forRootAsync(
      MultiTenantModule.buildAsyncConfig({
        ormType: 'typeorm',
        enableAdminController: true,
        useFactory: (config: ConfigService) => ({
          orm: {
            type: 'typeorm', // or Drizzle
          },
          database: createDatabaseConfigFromEnv(config),
          validationStrategy: 'local',
          enableAdminModule: true,
          autoCreateSchemas: true,
          platform: 'fastify',
        }),
        inject: [ConfigService],
      }),
    ),
  ],
})
export class AppModule {}
```

  **Características de este escenario:**
  
  - ✅ Configuración automática de TypeORM admin
  - ✅ `TenantAdminController` incluido por defecto
  - ✅ `TenantAdminService` con funcionalidades completas
  - ✅ Ideal para inicio rápido y desarrollo

  </TabItem>
  <TabItem value="typeorm-custom">

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MultiTenantModule,
  createDatabaseConfigFromEnv,
  createTenantStrategyProvider,
  TenantAdminService,
} from 'nestjs-multitenant';
import { CustomTenantAdminController } from './admin/controllers/tenant.controller';
import { CustomTenantAdminModule } from './admin/tenant-admin.module';

@Module({
  imports: [
    // ⚠️ IMPORTANTE: ConfigModule debe importarse ANTES que MultiTenantModule
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión principal de la aplicación
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'multitenant_db',
      schema: 'public',
      synchronize: true,
    }),

    // Configuración asíncrona con controller personalizado
    MultiTenantModule.forRootAsync(
      MultiTenantModule.buildAsyncConfig({
        ormType: 'typeorm',
        enableAdminController: false,
        additionalImports: [CustomTenantAdminModule],
        managementStrategyProvider:
          createTenantStrategyProvider(TenantAdminService),
        useFactory: (config: ConfigService) => ({
          orm: {
            type: 'typeorm',
          },
          database: createDatabaseConfigFromEnv(config),
          validationStrategy: 'local',
          enableAdminModule: false,
          autoCreateSchemas: true,
          platform: 'fastify',
        }),
        inject: [ConfigService],
      }),
    ),
  ],
})
export class AppModule {}
```

  **Características de este escenario:**
  
  - ✅ Configuración automática de TypeORM admin (requerido)
  - ❌ No incluye `TenantAdminController` por defecto
  - ✅ Usa tu controller personalizado
  - ✅ Usa `TenantAdminService` estándar o personalizado
  - ✅ Ideal para personalización de endpoints

  </TabItem>
  <TabItem value="drizzle-custom">

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  MultiTenantModule,
  createDatabaseConfigFromEnv,
  createTenantStrategyProvider,
  DrizzleTenantAdminService,
} from 'nestjs-multitenant';
import { CustomTenantAdminController } from './admin/controllers/tenant.controller';
import { CustomTenantAdminModule } from './admin/tenant-admin.module';
import { users } from './entities/user.entity';

@Module({
  imports: [
    // ⚠️ IMPORTANTE: ConfigModule debe importarse ANTES que MultiTenantModule
    ConfigModule.forRoot({ isGlobal: true }),

    // Configuración asíncrona con Drizzle ORM
    MultiTenantModule.forRootAsync(
      MultiTenantModule.buildAsyncConfig({
        ormType: 'drizzle',
        enableAdminController: false,
        additionalControllers: [CustomTenantAdminController],
        additionalImports: [CustomTenantAdminModule],
        managementStrategyProvider: createTenantStrategyProvider(
          DrizzleTenantAdminService,
        ),
        useFactory: (config: ConfigService) => ({
          orm: {
            type: 'drizzle',
            drizzle: {
              logger: true,
              schema: { users },
            },
          },
          database: createDatabaseConfigFromEnv(config),
          validationStrategy: 'local',
          enableAdminModule: false,
          autoCreateSchemas: true,
          platform: 'fastify',
        }),
        inject: [ConfigService],
      }),
    ),
  ],
})
export class AppModule {}
```

  **Características de este escenario:**
  
  - ❌ Sin configuración TypeORM admin (usa Drizzle)
  - ❌ No incluye controller por defecto
  - ✅ Usa tu controller personalizado
  - ✅ Usa `DrizzleTenantAdminService` o personalizado
  - ✅ Ideal para control total de migraciones y schemas

  </TabItem>
</Tabs>

### buildAsyncConfig Options

El método `buildAsyncConfig()` acepta las siguientes opciones:

```typescript
interface BuildMultitenantModuleOptions {
  useFactory: (
    ...args: any[]
  ) => Promise<MultiTenantModuleOptions> | MultiTenantModuleOptions;
  inject?: any[];
  ormType?: 'typeorm' | 'drizzle';
  enableAdminController?: boolean; // defaults to true
  additionalImports?: any[];
  additionalControllers?: Type<any>[];
  managementStrategyProvider?: Provider;
}
```

**Propiedades Principales:**

| Propiedad                    | Tipo                     | Default     | Descripción                                 |
| ---------------------------- | ------------------------ | ----------- | ------------------------------------------- |
| `ormType`                    | `'typeorm' \| 'drizzle'` | `'typeorm'` | ORM a usar para administración              |
| `enableAdminController`      | `boolean`                | `true`      | Incluir `TenantAdminController` por defecto |
| `additionalImports`          | `any[]`                  | `undefined` | Módulos adicionales a importar              |
| `additionalControllers`      | `Type<any>[]`            | `undefined` | Controllers personalizados a agregar        |
| `managementStrategyProvider` | `Provider`               | `undefined` | Provider personalizado para administración  |

### 🚨 Legacy forRootAsync (Deprecated)

:::warning
Esta configuración está deprecated desde v2.1.0. Usa `buildAsyncConfig()` para nuevos proyectos.
:::

Para configuraciones manuales con forRootAsync (método legacy):

```typescript
// Configuración legacy - NO RECOMENDADA
TypeOrmModule.forRootAsync({
  name: 'admin',
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    return getAdminDatabaseConfig(configService);
  },
}),

MultiTenantModule.forRootAsync({
  inject: [ConfigService],
  imports: [
    TypeOrmModule.forFeature([Tenant], 'admin'),
    // CustomTenantAdminModule // Importa tu módulo con controllers
  ],
  useFactory: (configService: ConfigService) => ({
    database: createDatabaseConfigFromEnv(configService),
    orm: {
      type: 'typeorm',
    },
    enableAdminModule: false,
    autoCreateSchemas: true,
    platform: 'fastify',
  }),
  managementStrategyProvider: createTenantStrategyProvider(TenantAdminService),
  controllers: [CustomTenantAdminController],
}),
```

## Configuration Options

### ORM Configuration

The `orm` option allows you to choose and configure your preferred ORM:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM">

```typescript
orm: {
  type: 'drizzle',
  drizzle: {
    schema: { /* your drizzle schema objects */ },
    logger?: boolean,        // Enable Drizzle query logging
    ssl?: boolean | object,  // SSL configuration
  },
}
```

**Drizzle Schema Example:**

```typescript
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Use in configuration
drizzle: {
  schema: { users }, // Register all your tables
  logger: true,
}
```

  </TabItem>
  <TabItem value="typeorm" label="TypeORM">

```typescript
orm: {
  type: 'typeorm',
  typeorm: {
    autoLoadEntities?: boolean, // Auto-load entities
    synchronize?: boolean,      // Auto-sync schemas (dev only!)
    logging?: boolean,          // Enable SQL logging
  },
}
```

  </TabItem>
</Tabs>

**Note**: If you omit the `orm` option, it defaults to TypeORM for backward compatibility.

### Database Configuration

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | object; // SSL configuration
}
```

### Tenant Resolution Configuration

```typescript
tenantResolution: {
  strategy: 'header' | 'subdomain' | 'jwt' | 'custom',
  headerName: 'x-tenant-id',      // For header strategy
  jwtClaimName: 'tenantId',       // For JWT strategy
  defaultTenant: 'default',       // Fallback tenant
  customResolver: (req) => {       // For custom strategy
    return extractTenantFromRequest(req);
  },
}
```

### Connection Pool Configuration

```typescript
connectionPool: {
  maxConnections: 50,      // Maximum concurrent connections
  idleTimeout: 30000,      // Idle connection timeout (ms)
  enableCleanup: true,     // Auto-cleanup idle connections
  cleanupInterval: 60000,  // Cleanup interval (ms)
}
```

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=multitenant_db

# Multi-Tenant
TENANT_HEADER=x-tenant-id
AUTO_CREATE_SCHEMAS=true
ENABLE_ADMIN_MODULE=true
PLATFORM=express

# Drizzle ORM Admin Migrations (Drizzle only)
MULTITENANT_RUN_ADMIN_MIGRATIONS=true  # Default: true

# Connection Pool
MAX_CONNECTIONS=50
IDLE_TIMEOUT=30000
```

## Next Steps

- Configure [Tenant Resolution](/docs/guides/tenant-resolution)
- Set up [PostgreSQL](/docs/guides/setup-postgres)
- Learn about [Entity Registry](/docs/core-concepts/entity-registry)
