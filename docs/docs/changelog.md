---
sidebar_position: 100
title: Changelog
---

# Changelog

All notable changes to nestjs-multitenant.

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
