---
sidebar_position: 1
title: Modules
---

# Modules

## MultiTenantModule

Core module for multi-tenancy functionality.

### forRoot()

Static configuration.

**Options:**

- `validationStrategy`: (`'local' | 'remote' | 'custom'`) - specific strategy to validate tenants.
- `remoteServiceUrl`: (`string`) - URL for the remote validation service (required if strategy is 'remote').
- `customProviders`: (`Provider[]`) - Array of custom providers (used for custom strategies).

### forRootAsync()

Async configuration with dependency injection.

## AdminModule

Tenant administration module.
