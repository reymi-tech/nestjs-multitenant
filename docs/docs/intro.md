---
sidebar_position: 1
title: Introduction
description: Complete multi-tenant solution for NestJS with PostgreSQL schema-per-tenant architecture
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# NestJS MultiTenant

A comprehensive and production-ready multi-tenant solution for NestJS applications using PostgreSQL's **schema-per-tenant** architecture. Build scalable SaaS applications with complete tenant isolation, dynamic connection management, and a rich set of utilities.

## Key Features

### Schema-per-Tenant Architecture

Each tenant gets its own dedicated PostgreSQL schema, ensuring complete data isolation while sharing the same database instance. This approach provides the perfect balance between isolation and resource efficiency.

### Automatic Tenant Resolution

Out-of-the-box support for multiple tenant resolution strategies:

- **Header-based**: Extract tenant ID from HTTP headers
- **Subdomain**: Use subdomains to identify tenants (e.g., `acme.yourapp.com`)
- **JWT Token**: Extract tenant information from JWT claims

- **Custom**: Implement your own resolution logic

### Flexible Tenant Validation

Ensure data integrity and security by validating tenants against:

- **Local Database**: Direct check against your tenant table (Default).
- **Remote Service**: Validate against a centralized tenant service in microservices.
- **Custom Logic**: Implement your own validation rules (e.g., Redis, LDAP).

[Learn more about Tenant Validation](/docs/core-concepts/validation-strategies)

### Dynamic Connection Pooling

Intelligent connection pool management that creates and maintains database connections per tenant on-demand, with automatic cleanup of idle connections.

### Multi-ORM Support

Choose between two powerful ORMs based on your needs:

- **Drizzle ORM** (Recommended): Lightweight, performant, with excellent TypeScript support
- **TypeORM** (Default): Mature ecosystem with familiar patterns

Learn more about [choosing between ORMs](/docs/core-concepts/orm-comparison)

### Type-Safe Dependency Injection

Use tenant-scoped injection with decorators tailored to your ORM:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM">

```typescript
@InjectTenantDb()
private db: NodePgDatabase
```

  </TabItem>
  <TabItem value="typeorm" label="TypeORM">

```typescript
@InjectTenantRepository(User)
private userRepository: Repository<User>
```

  </TabItem>
</Tabs>

### Complete Tenant Administration

Built-in admin module for managing tenants with CRUD operations, schema provisioning, and entity configuration per tenant.

### Flexible Entity Registry

Configure which entities are available for each tenant, supporting different tenant tiers (basic, premium, enterprise) with preset entity configurations.

## Why Use This Package?

### Perfect for SaaS Applications

If you're building a multi-tenant SaaS application with NestJS and PostgreSQL, this package provides everything you need out of the box.

### Production-Ready

- Comprehensive test coverage
- TypeScript-first design with full type safety
- Battle-tested connection pooling
- Security best practices built-in

### Developer-Friendly

- Intuitive API design
- Comprehensive documentation
- Rich examples for common use cases
- Compatible with both Express and Fastify

### Highly Scalable

- Efficient resource utilization
- Connection pooling with configurable limits
- Automatic cleanup of idle connections
- Support for hundreds or thousands of tenants

## Use Cases

- **SaaS Platforms**: Build multi-tenant SaaS applications with complete data isolation
- **White-Label Solutions**: Provide customized instances for each client
- **Enterprise Applications**: Multi-division or multi-department applications
- **Education Platforms**: Separate data for different schools or institutions
- **E-commerce Marketplaces**: Isolated vendor spaces within a single platform

## Requirements

- **Node.js**: >= 22.x
- **NestJS**: >= 11.x
- **TypeScript**: >= 5.9
- **PostgreSQL**: >= 12.x
- **Choose your ORM**:
  - **Drizzle ORM**: >= 0.29.x (recommended for new projects)
  - **TypeORM**: >= 0.3.x (default for compatibility)

## Quick Example

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
    }),
  ],
})
export class AppModule {}
```

## What's Next?

Ready to get started? Here are some suggested paths:

- **New to multi-tenancy?** Start with [Core Concepts: Architecture](/docs/core-concepts/architecture) to understand how it works
- **Ready to build?** Jump to [Quick Start](/docs/getting-started/quick-start) for a working example in 5 minutes
- **Migrating?** Check out [Migration Guides](/docs/migration-guides/from-database-per-tenant)
- **Need help?** Visit [Troubleshooting](/docs/advanced/troubleshooting) for common issues

## Community and Support

- **GitHub**: [Report issues](https://github.com/reymi-tech/nestjs-multitenant/issues) or contribute
- **npm**: [View on npm](https://www.npmjs.com/package/nestjs-multitenant)
- **Email**: lmorochofebres@gmail.com

## License

MIT © [Reymi Tech](https://github.com/reymi-tech)
