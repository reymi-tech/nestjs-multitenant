---
sidebar_position: 3
title: Configuration
description: Configure nestjs-multitenant for your application
---

# Configuration

Comprehensive guide to configuring the MultiTenantModule for your specific needs.

## Basic Configuration (forRoot)

```typescript
import { Module } from '@nestjs/common';
import { MultiTenantModule } from 'nestjs-multitenant';

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
      platform: 'express',
      autoCreateSchemas: true,
      enableAdminModule: true,
      // Optional: Custom Tenant Admin Controller and Service
      // customControllers: [CustomTenantAdminController],
      // customProviders: [
      //   createTenantStrategyProvider(TenantAdminService)
      // ]
    }),
  ],
})
export class AppModule {}
```

## Async Configuration (forRootAsync)

For dynamic configuration using ConfigService:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  MultiTenantModule,
  createDatabaseConfigFromEnv,
} from 'nestjs-multitenant';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Tenant,
  createTenantStrategyProvider,
  TenantAdminService,
} from 'nestjs-multitenant';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Mandatory: Admin Database Configuration
    TypeOrmModule.forRootAsync({
      name: 'admin',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getAdminDatabaseConfig(configService),
    }),

    MultiTenantModule.forRootAsync({
      inject: [ConfigService],
      imports: [
        TypeOrmModule.forFeature([Tenant], 'admin'),
        CustomTenantAdminModule, // Import your module with controllers, using wrapper. Option 1
      ],
      useFactory: (configService: ConfigService) => ({
        database: createDatabaseConfigFromEnv(configService),
        platform: configService.get('PLATFORM', 'express'),
        autoCreateSchemas: configService.get('AUTO_CREATE_SCHEMAS', true),
        enableAdminModule: configService.get('ENABLE_ADMIN_MODULE', true),
        validationStrategy: 'local',
        // customControllers: [CustomTenantAdminController] // Option 2
      }),
      // controllers: [CustomTenantAdminController] // Option 3
      // Optional: Custom Tenant Admin Controller and Service
      managementStrategyProvider:
        createTenantStrategyProvider(TenantAdminService),
    }),
  ],
})
export class AppModule {}
```

## Configuration Options

### Database Configuration

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize?: boolean; // Auto-sync schemas (dev only!)
  logging?: boolean; // Enable SQL logging
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

# Connection Pool
MAX_CONNECTIONS=50
IDLE_TIMEOUT=30000
```

## Next Steps

- Configure [Tenant Resolution](/docs/guides/tenant-resolution)
- Set up [PostgreSQL](/docs/guides/setup-postgres)
- Learn about [Entity Registry](/docs/core-concepts/entity-registry)
