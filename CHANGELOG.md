# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to
Semantic Versioning.

## [1.0.0] - 2025-11-06

### Added

- Initial public release of nestjs-multitenant
- Multi-tenant module, services, providers and decorators
- Fastify and Express middlewares for tenant resolution
- TypeORM repository injection helpers and token utilities
- Unit test suite and CI workflow for build/test

### Changed

- Package scoped name and publish configuration for npm
- README with installation and usage instructions

### Security

- Verified no hardcoded credentials or absolute paths in sources

## [1.2.0] - 2026-01-22

### Added

- Flexible Tenant Validation Strategies (`local`, `remote`, `custom`).
- New `validationStrategy` and `remoteServiceUrl` options in `MultiTenantModule` configuration.
- `findByCode` and `validate` endpoints in `TenantAdminController`.
- Documentation for Tenant Validation Strategies.

### Changed

- `TenantAdminService` now includes methods for validating and finding tenants by code.
- Updated `RemoteTenantValidationStrategy` to use the new Admin API endpoints.

## [Unreleased]

- TBA
