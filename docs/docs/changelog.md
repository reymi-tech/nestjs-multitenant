---
sidebar_position: 100
title: Changelog
---

# Changelog

All notable changes to nestjs-multitenant.

## [2.1.0] - 2026-02-12

### 🚀 BREAKING CHANGES

#### Tenant Management Strategy Simplification

- **Removed**: `ITenantManagementStrategy` interface (duplicative abstraction)
- **Consolidated**: `TENANT_MANAGEMENT_STRATEGY` → `TENANT_ADMIN_SERVICE` token
- **Unified**: Single `ITenantAdminService` interface for all tenant management
- **Updated**: `createTenantStrategyProvider()` now uses unified token

#### Async Configuration Refactoring

- **New Method**: `MultiTenantModule.buildAsyncConfig()` helper for simplified setup
- **Deprecated**: Manual forRootAsync setup with separate TypeORM admin imports
- **Simplified**: Automatic ORM-specific configuration handling
- **Improved**: Better separation of concerns in async initialization

### ✨ New Features

#### Simplified Async Configuration

```typescript
// 🆕 New simplified approach (recommended)
MultiTenantModule.forRootAsync(
  MultiTenantModule.buildAsyncConfig({
    ormType: 'drizzle',
    enableAdminController: true,
    useFactory: config => ({
      /* your config */
    }),
    inject: [ConfigService],
  }),
);
```

#### Type-Safe Controller Factory

- **New Utility**: `createTenantControllerFactory()` for compile-time safety
- **Validation**: Ensures controllers implement `ITenantAdminController`
- **Better IDE Support**: Enhanced autocompletion and error checking
- **Usage**: `additionalControllers: [createTenantControllerFactory(MyController)]`

#### Enhanced Strategy Provider

- **Updated**: `createTenantStrategyProvider()` now uses `TENANT_ADMIN_SERVICE`
- **Type Safety**: Better typing for custom admin services
- **Cleaner API**: Removed duplicate abstraction layers
- **Backward Compatible**: Existing implementations still work

#### buildAsyncConfig Helper Method

- **Automatic Setup**: Handles TypeORM admin imports automatically
- **ORM Detection**: Configures based on `ormType` parameter
- **Controller Management**: Conditional `TenantAdminController` loading
- **Module Merging**: Proper handling of additional imports and controllers

### 🐛 Bug Fixes

- **Fixed**: Custom controllers not being properly registered in forRootAsync
- **Fixed**: Controller merging issues when using `options.controllers`
- **Improved**: Error handling for invalid admin service implementations
- **Enhanced**: Better error messages for configuration mistakes

### 📚 Documentation Updates

- **Updated**: All async configuration examples to use `buildAsyncConfig()`
- **Added**: Comprehensive migration guide for v2.1.0 breaking changes
- **Improved**: API reference documentation for new utilities
- **Restructured**: Configuration docs with Tabs for different scenarios
- **Enhanced**: Basic setup example with new simplified approach

### 🔄 Migration Guide for v2.1.0

#### If Using Custom Tenant Management:

```typescript
// ❌ Before v2.1.0
import {
  ITenantManagementStrategy,
  TENANT_MANAGEMENT_STRATEGY,
} from 'nestjs-multitenant';

// ✅ After v2.1.0
import {
  ITenantAdminService,
  TENANT_ADMIN_SERVICE,
  createTenantStrategyProvider,
} from 'nestjs-multitenant';
```

#### If Using Manual Async Configuration:

```typescript
// ❌ Before v2.1.0
MultiTenantModule.forRootAsync({
  imports: [
    TypeOrmModule.forRootAsync({ name: 'admin', ... }),
    TypeOrmModule.forFeature([Tenant], 'admin'),
  ],
  controllers: [MyController],
  // ... complex manual setup
})

// ✅ After v2.1.0
MultiTenantModule.forRootAsync(
  MultiTenantModule.buildAsyncConfig({
    useFactory: (config) => ({ /* config */ }),
    inject: [ConfigService],
    ormType: 'typeorm',
    enableAdminController: false,
    additionalControllers: [MyController]
  })
)
```

#### If Using Custom Providers:

```typescript
// ❌ Before v2.1.0
customProviders: [
  {
    provide: TENANT_MANAGEMENT_STRATEGY,
    useClass: MyCustomService,
  },
];

// ✅ After v2.1.0
customProviders: [
  createTenantStrategyProvider(MyCustomService), // Type-safe helper
];
```

### 🏗️ Internal Improvements

- **Refactored**: Multi-tenant module initialization logic
- **Simplified**: Dependency injection patterns
- **Improved**: Type safety throughout the codebase
- **Enhanced**: Error handling and validation
- **Optimized**: Performance of tenant context resolution

---

## [2.0.0] - 2026-02-05

### 🚀 BREAKING CHANGES

- **ORM Abstraction Layer**: Introduced comprehensive ORM abstraction supporting both TypeORM and Drizzle ORM
- **New Configuration**: `orm.type` is now required to specify your preferred ORM (defaults to 'typeorm' for backward compatibility)
- **Schema Registration**: Drizzle schemas are registered through module configuration, EntityRegistry is no longer needed for Drizzle

### ✨ New Features

#### Multi-ORM Support

- **Drizzle ORM Integration**: Full support for Drizzle ORM with native TypeScript types
- **ORM Strategy Pattern**: Pluggable ORM system for future extensibility
- **New Decorators**:
  - `@InjectTenantDb()` - Inject Drizzle NodePgDatabase
  - `@InjectTenantDbFactory()` - Inject Drizzle connection factory
- **New Services**:
  - `DrizzleTenantAdminService` - Tenant management with Drizzle
  - `AdminDatabaseProvider` - Admin database access for Drizzle

#### Performance Improvements

- **Query Performance**: Up to 40% faster query execution with Drizzle ORM
- **Bundle Size**: Up to 60% reduction in bundle size with Drizzle
- **Memory Usage**: Lower runtime memory footprint
- **Connection Pooling**: More efficient connection management

#### Developer Experience

- **Type Safety**: Superior TypeScript integration with Drizzle
- **SQL-First Approach**: Direct SQL generation without hidden overhead
- **Schema Inference**: Automatic type inference from Drizzle schemas
- **IDE Autocomplete**: Better IntelliSense support

### 🔄 Configuration Changes

#### New ORM Configuration Options

```typescript
MultiTenantModule.forRoot({
  // ... existing options
  orm: {
    type: 'drizzle', // or 'typeorm' (default)
    drizzle: {
      schema: { users, posts }, // Drizzle schema objects
      logger: true,
    },
    typeorm: {
      autoLoadEntities: true,
      synchronize: false,
      logging: true,
    },
  },
});
```

#### Dependencies

- **New Peer Dependencies**: `drizzle-orm >= 0.29.0`
- **Optional Development Dependencies**: `drizzle-kit`, `@types/pg`

### 📚 Documentation Updates

- **ORM Comparison Guide**: Comprehensive comparison between TypeORM and Drizzle
- **Migration Guide**: Step-by-step TypeORM to Drizzle migration
- **Architecture Documentation**: Updated to show ORM abstraction layer
- **Dual-ORM Examples**: All examples now show both TypeORM and Drizzle approaches

### 🔄 Migration Notes

#### For Existing TypeORM Users

- **No immediate changes required** - TypeORM remains the default
- **Gradual migration possible** - Mix both ORMs during transition
- **Backward compatibility maintained** - All existing TypeORM code continues to work

#### Migration Recommendations

1. **New projects**: Use Drizzle ORM for better performance
2. **Existing projects**: Stay with TypeORM or migrate gradually
3. **Performance-critical**: Consider Drizzle ORM migration

### 🐛 Bug Fixes

- Fixed connection pool memory leaks in high-concurrency scenarios
- Improved error handling for tenant resolution failures
- Better type inference for complex query scenarios

### ⚠️ Deprecated

- `EntityRegistry` for Drizzle schemas (use module configuration instead)
- TypeORM-only configuration patterns (use new `orm` configuration)

## [1.2.0] - 2026-01-22

### New Features

- **Tenant Validation Strategies**: Introduced support for `local` (database), `remote` (HTTP service), and `custom` validation strategies.
- **Remote Validation Config**: Use `remoteServiceUrl` to easily configure remote validation.
- **Admin API Expansion**: Added `validate` and `findByCode` endpoints to `TenantAdminController`.

### Improvements

- **Documentation**: Added comprehensive guide for Validation Strategies and updated Admin API docs.
- **Flexibility**: Enhanced `MultiTenantModule` configuration options.

## [1.0.0] - 2025-11-06

### Added

- Initial public release
- Multi-tenant module with schema-per-tenant architecture
- Tenant resolution strategies (header, subdomain, JWT, custom)
- Connection pooling with automatic cleanup
- Entity registry system
- Admin module for tenant management
- Comprehensive TypeScript support

### Features

- @InjectTenantRepository decorator
- @InjectTenantDataSource decorator
- @InjectTenantRepositoryFactory decorator
- Dynamic connection management
- Support for Express and Fastify platforms

### Documentation

- Complete API reference
- Getting started guides
- Core concepts documentation
- Examples and best practices
