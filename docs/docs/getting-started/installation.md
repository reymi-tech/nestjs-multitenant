---
sidebar_position: 1
title: Installation
description: Install nestjs-multitenant and configure peer dependencies
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installation

This guide will help you install `nestjs-multitenant` and configure all required dependencies.

## Prerequisites

Before installing, ensure your environment meets these requirements:

- **Node.js**: >= 22.x
- **pnpm**: >= 10.x (recommended) or npm >= 9.x
- **PostgreSQL**: >= 12.x
- **NestJS**: >= 11.x
- **TypeScript**: >= 5.9

## Install the Package

Using pnpm (recommended):

```bash
pnpm add nestjs-multitenant
```

Using npm:

```bash
npm install nestjs-multitenant
```

Using yarn:

```bash
yarn add nestjs-multitenant
```

## Choose Your ORM

The NestJS Multitenant package supports two powerful ORMs. Choose the one that best fits your project needs:

<Tabs>
  <TabItem value="drizzle" label="Drizzle ORM (Recommended)">

**Why Drizzle ORM?**

- ✅ Better performance (up to 40% faster)
- ✅ Smaller bundle size (up to 60% reduction)
- ✅ Superior TypeScript support
- ✅ Modern SQL-first approach
- ✅ Excellent for new projects

### Install Peer Dependencies for Drizzle

```bash
pnpm add @nestjs/common@^11.1.7 \
         @nestjs/config@^4.0.2 \
         @nestjs/core@^11.1.7 \
         @nestjs/mapped-types@^2.1.0 \
         class-transformer@^0.5.1 \
         class-validator@^0.14.2 \
         drizzle-orm@^0.29.0 \
         pg@^8.16.3 \
         reflect-metadata@^0.2.2
```

### Development Dependencies

```bash
pnpm add -D drizzle-kit @types/pg
```

  </TabItem>
  <TabItem value="typeorm" label="TypeORM (Default)">

**Why TypeORM?**

- ✅ Mature ecosystem
- ✅ Familiar decorator patterns
- ✅ Extensive features
- ✅ Great for existing projects
- ✅ Default for backward compatibility

### Install Peer Dependencies for TypeORM

```bash
pnpm add @nestjs/common@^11.1.7 \
         @nestjs/config@^4.0.2 \
         @nestjs/core@^11.1.7 \
         @nestjs/mapped-types@^2.1.0 \
         @nestjs/typeorm@^11.0.0 \
         class-transformer@^0.5.1 \
         class-validator@^0.14.2 \
         pg@^8.16.3 \
         reflect-metadata@^0.2.2 \
         typeorm@^0.3.27
```

### Development Dependencies

```bash
pnpm add -D @types/pg
```

  </TabItem>
</Tabs>

## Platform-Specific Dependencies

Depending on your web platform, install one of these:

### For Express (Default)

```bash
npm install express@^5.1.0
```

### For Fastify

```bash
npm install fastify@^5.6.1
```

## Verify Installation

Create a simple test file to verify the installation:

```typescript title="test-installation.ts"
import { MultiTenantModule } from 'nestjs-multitenant';

console.log('nestjs-multitenant installed successfully!');
console.log('Version:', require('nestjs-multitenant/package.json').version);
```

Run it:

```bash
npx tsx test-installation.ts
```

## TypeScript Configuration

Ensure your `tsconfig.json` has these essential settings:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "esModuleInterop": true
  }
}
```

## PostgreSQL Setup

Install PostgreSQL if you haven't already:

### macOS (using Homebrew)

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

### Windows

Download and install from [PostgreSQL Official Site](https://www.postgresql.org/download/windows/)

### Using Docker

```bash
docker run --name postgres-multitenant \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=multitenant_db \
  -p 5432:5432 \
  -d postgres:16-alpine
```

## Create Database

Connect to PostgreSQL and create your database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE multitenant_db;
```

Or using Docker:

```bash
docker exec -it postgres-multitenant psql -U postgres -c "CREATE DATABASE multitenant_db;"
```

## Troubleshooting

### "Cannot find module 'nestjs-multitenant'"

**Solution**: Ensure the package is installed and your `node_modules` folder is not corrupted:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Peer Dependency Warnings

If you see peer dependency warnings, install the specific versions mentioned in the warnings or use the `--legacy-peer-deps` flag:

```bash
npm install --legacy-peer-deps
```

### PostgreSQL Connection Issues

**Solution**: Verify PostgreSQL is running:

```bash
# Check if PostgreSQL is running
pg_isready

# Or check the service status
sudo systemctl status postgresql
```

### TypeScript Decorator Errors

**Solution**: Ensure `experimentalDecorators` and `emitDecoratorMetadata` are set to `true` in your `tsconfig.json`.

## Next Steps

Now that you have everything installed:

1. Continue to [Quick Start](/docs/getting-started/quick-start) to build your first multi-tenant app
2. Learn about [Configuration](/docs/getting-started/configuration) options
3. Understand the [Architecture](/docs/core-concepts/architecture) behind the package

## Package Information

- **npm**: [nestjs-multitenant](https://www.npmjs.com/package/nestjs-multitenant)
- **GitHub**: [reymi-tech/nestjs-multitenant](https://github.com/reymi-tech/nestjs-multitenant)
- **License**: MIT
- **Minimum Node.js**: 22.x
- **Current Version**: 1.0.0
