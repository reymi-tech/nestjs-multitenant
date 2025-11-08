---
sidebar_position: 2
title: Tenant Resolution
description: Learn how to resolve tenants from incoming requests
---

# Tenant Resolution

Understanding how the system identifies which tenant a request belongs to.

## Resolution Strategies

### Header-Based (Default)

Extract tenant ID from HTTP header:

```typescript
MultiTenantModule.forRoot({
  tenantResolution: {
    strategy: 'header',
    headerName: 'x-tenant-id',
  },
});
```

Request example:

```bash
curl -H "x-tenant-id: acme" http://localhost:3000/api/users
```

### Subdomain-Based

Use subdomain as tenant identifier:

```typescript
MultiTenantModule.forRoot({
  tenantResolution: {
    strategy: 'subdomain',
  },
});
```

Examples:

- `acme.yourapp.com` → tenant: acme
- `techcorp.yourapp.com` → tenant: techcorp

### JWT Token

Extract tenant from JWT claims:

```typescript
MultiTenantModule.forRoot({
  tenantResolution: {
    strategy: 'jwt',
    jwtClaimName: 'tenantId',
  },
});
```

JWT payload example:

```json
{
  "sub": "user123",
  "tenantId": "acme",
  "exp": 1234567890
}
```

### Custom Resolution

Implement custom logic:

```typescript
MultiTenantModule.forRoot({
  tenantResolution: {
    strategy: 'custom',
    customResolver: (request: any) => {
      // Custom logic here
      const tenantId = request.query.tenant || request.body.tenantId;
      return tenantId;
    },
  },
});
```

## Best Practices

- Always validate tenant existence
- Handle missing tenant gracefully
- Log tenant resolution for debugging
- Cache tenant lookups when possible

## Next Steps

- Implement [Authentication](/docs/examples/with-authentication)
- Configure [Testing](/docs/guides/testing)
