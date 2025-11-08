---
sidebar_position: 1
title: PostgreSQL Setup
description: Configure PostgreSQL for multi-tenant architecture
---

# PostgreSQL Setup

Learn how to set up and configure PostgreSQL for schema-per-tenant multi-tenancy.

## Installation

### Using Docker (Recommended for Development)

```bash
docker run --name postgres-multitenant   -e POSTGRES_PASSWORD=password   -e POSTGRES_DB=multitenant_db   -p 5432:5432   -d postgres:16-alpine
```

### macOS

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Create Database

```sql
CREATE DATABASE multitenant_db;
```

## Create Admin User (Optional)

```sql
CREATE USER multitenant_admin WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE multitenant_db TO multitenant_admin;
```

## Schema-per-Tenant Architecture

Each tenant gets its own PostgreSQL schema:

```
multitenant_db
├── public (admin tables: tenants, etc.)
├── tenant_acme (Acme Corp's schema)
├── tenant_techcorp (TechCorp's schema)
└── tenant_startup (Startup Inc's schema)
```

## Verify Setup

```bash
psql -U postgres -d multitenant_db -c "SELECT version();"
```

## Security Recommendations

- Use strong passwords
- Enable SSL for production
- Limit database user privileges
- Use connection pooling
- Regular backups

## Next Steps

- Configure [Tenant Resolution](/docs/guides/tenant-resolution)
- Set up [Migrations](/docs/guides/migrations)
