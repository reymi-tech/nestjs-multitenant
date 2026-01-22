---
sidebar_position: 100
title: Changelog
---

# Changelog

All notable changes to nestjs-multitenant.

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
