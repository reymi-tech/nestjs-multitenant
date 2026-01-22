---
sidebar_position: 4
title: Admin API
---

# Tenant Admin API

The `TenantAdminController` provides a set of endpoints for managing tenants. These endpoints are available when `enableAdminModule` is true (default) and no `customControllers` are provided for the admin module.

:::important
If you provide your own implementation keying validation strategy via the `customControllers` option, you **MUST** implement the `validate` and `findByCode` endpoints compatible with the Remote Validation Strategy if you intend to use it.
:::

## Base URL

All endpoints are prefixed with `/admin/tenant`.

## Endpoints

### 1. Validate Tenant Existence

Checks if a tenant with the given code exists. Used by `RemoteTenantValidationStrategy`.

- **URL**: `/admin/tenant/validate/:code`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "exists": true
  }
  ```

### 2. Find Tenant by Code

Retrieves tenant details by their unique code. Used by `RemoteTenantValidationStrategy`.

- **URL**: `/admin/tenant/code/:code`
- **Method**: `GET`
- **Response**: `Tenant` object or 404.

### 3. Create Tenant

Creates a new tenant.

- **URL**: `/admin/tenant`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "code": "acme",
    "name": "ACME Corp",
    "plan": "premium",
    "ownerEmail": "admin@acme.com"
  }
  ```

### 4. Get All Tenants

Retrieves a paginated list of tenants.

- **URL**: `/admin/tenant`
- **Method**: `GET`
- **Query Params**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search term (name, code, or description)
  - `status`: Filter by status (`ACTIVE`, `INACTIVE`, etc.)

### 5. Get Tenant by ID

Retrieves a tenant by their internal UUID.

- **URL**: `/admin/tenant/:id`
- **Method**: `GET`

### 6. Update Tenant

Updates tenant details.

- **URL**: `/admin/tenant/:id`
- **Method**: `PATCH`
- **Body**: Partial tenant object.

### 7. Delete Tenant

Soft deletes a tenant.

- **URL**: `/admin/tenant/:id`
- **Method**: `DELETE`

### 8. Get Stats

Retrieves overview statistics (total, active, inactive, etc.).

- **URL**: `/admin/tenant/stats/overview`
- **Method**: `GET`

### 9. Activate Tenant

Activates a tenant, allowing them to access the system.

- **URL**: `/admin/tenant/:id/activate`
- **Method**: `PATCH`

### 10. Deactivate Tenant

Deactivates a tenant, preventing access.

- **URL**: `/admin/tenant/:id/deactivate`
- **Method**: `PATCH`
