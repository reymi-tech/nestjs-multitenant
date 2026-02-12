---
sidebar_position: 1
title: Basic Setup
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Basic Setup Example

Simple multi-tenant application with user management demonstrating the schema-per-tenant pattern.

:::note Updated for v2.1.0
This example uses the new `buildAsyncConfig()` method introduced in v2.1.0, which simplifies async configuration significantly. For legacy examples, see the [configuration documentation](/docs/getting-started/configuration).
:::

## Prerequisites

- PostgreSQL database created
- Node.js and pnpm installed
- Complete [Installation](/docs/getting-started/installation) guide

## Project Structure

```
src/
├── app.module.ts
├── main.ts
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── schemas/
│       ├── company1.schema.ts
│       ├── company2.schema.ts
│       └── index.ts
└── config/
    └── database.config.ts
```

## Database Schemas (Drizzle ORM)

### Create Schema Files

<Tabs>
  <TabItem value="company1" label="company1.schema.ts">

```typescript title="src/users/schemas/company1.schema.ts"
import {
  pgSchema,
  pgTable,
  uuid,
  varchar,
  sql,
  uniqueIndex,
  timestamp,
} from 'drizzle-orm/pg-core';

// Helper function to create prefixed schemas
const prefixSchema = (schema: string) => pgSchema(`tenant_${schema}`);

// Company 1 Schema
export const company1Schema = prefixSchema('company1');

export const users = company1Schema.table(
  'users',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    isActive: varchar('is_active', { length: 10 }).default('true').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [uniqueIndex('users_email_unique').on(table.email)],
);

// Types inferred from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

  </TabItem>
  <TabItem value="company2" label="company2.schema.ts">

```typescript title="src/users/schemas/company2.schema.ts"
import {
  pgSchema,
  pgTable,
  uuid,
  varchar,
  sql,
  uniqueIndex,
  timestamp,
} from 'drizzle-orm/pg-core';

// Helper function to create prefixed schemas
const prefixSchema = (schema: string) => pgSchema(`tenant_${schema}`);

// Company 2 Schema
export const company2Schema = prefixSchema('company2');

export const users = company2Schema.table(
  'users',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    isActive: varchar('is_active', { length: 10 }).default('true').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [uniqueIndex('users_email_unique').on(table.email)],
);

// Types inferred from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

  </TabItem>
  <TabItem value="index" label="schemas/index.ts">

```typescript title="src/users/schemas/index.ts"
import { company1Schema, users as company1Users } from './company1.schema';
import { company2Schema, users as company2Users } from './company2.schema';

// Export all schemas for module configuration
export const schemas = {
  company1: {
    schema: company1Schema,
    tables: { users: company1Users },
  },
  company2: {
    schema: company2Schema,
    tables: { users: company2Users },
  },
};

// Export individual schemas for imports
export { company1Schema, company2Schema };
export { users as company1Users } from './company1.schema';
export { users as company2Users } from './company2.schema';
```

  </TabItem>
</Tabs>

### Generate Migrations

Create `drizzle.config.ts`:

```typescript title="drizzle.config.ts"
import { defineConfig } from 'drizzle-kit';
import { company1Schema, company2Schema } from './src/users/schemas';

export default defineConfig({
  schema: ['./src/users/schemas/**/*.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:password@localhost:5432/multitenant_db',
  },
  verbose: true,
  strict: true,
});
```

Generate migrations:

```bash
pnpm drizzle-kit generate
```

## Application Setup

### Environment Variables

```env title=".env"
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/multitenant_db
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=multitenant_db

# Multi-Tenant
TENANT_HEADER=x-tenant-id
AUTO_CREATE_SCHEMAS=true
ENABLE_ADMIN_MODULE=true
PLATFORM=express
MULTITENANT_RUN_ADMIN_MIGRATIONS=true

# Connection Pool
MAX_CONNECTIONS=50
IDLE_TIMEOUT=30000
```

### Database Configuration

```typescript title="src/config/database.config.ts"
export const getAdminDatabaseConfig = (configService: any) => ({
  type: 'postgres' as const,
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_DATABASE', 'multitenant_db'),
  entities: [Tenant],
  synchronize: true, // For development only
  logging: true,
});
```

### Application Module

```typescript title="src/app.module.ts"
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MultiTenantModule,
  createDatabaseConfigFromEnv,
} from 'nestjs-multitenant';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // 🆕 Configuración simplificada con buildAsyncConfig (v2.1.0+)
    MultiTenantModule.forRootAsync(
      MultiTenantModule.buildAsyncConfig({
        ormType: 'drizzle',
        enableAdminController: true, // Usa controller admin por defecto
        useFactory: (config: ConfigService) => ({
          orm: {
            type: 'drizzle',
            drizzle: {
              schema: {
                // Register all your table schemas
                users: require('./users/schemas/company1.schema').users,
              },
              logger: true,
            },
          },
          database: createDatabaseConfigFromEnv(config),
          validationStrategy: 'local',
          autoCreateSchemas: true,
          platform: 'fastify',
        }),
        inject: [ConfigService],
      }),
    ),

    UsersModule,
  ],
})
export class AppModule {}
```

### Users Module

```typescript title="src/users/users.module.ts"
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### Users Service

```typescript title="src/users/users.service.ts"
import { Injectable } from '@nestjs/common';
import { InjectTenantDb } from 'nestjs-multitenant';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { users, NewUser, User } from './schemas/company1.schema';

@Injectable()
export class UsersService {
  constructor(@InjectTenantDb() private readonly db: NodePgDatabase) {}

  async create(createUserDto: NewUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(createUserDto)
      .returning();
    return user;
  }

  async findAll(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async findOne(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || null;
  }

  async update(
    id: string,
    updateUserDto: Partial<NewUser>,
  ): Promise<User | null> {
    const [user] = await this.db
      .update(users)
      .set(updateUserDto)
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
```

### Users Controller

```typescript title="src/users/users.controller.ts"
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { NewUser, User } from './schemas/company1.schema';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: User,
  })
  async create(@Body() createUserDto: NewUser): Promise<User> {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: [User] })
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated', type: User })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<NewUser>,
  ): Promise<User> {
    const user = await this.usersService.update(id, updateUserDto);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
```

### Main Application

```typescript title="src/main.ts"
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Multi-Tenant API')
    .setDescription('API documentation for multi-tenant application')
    .setVersion('1.0')
    .addTag('users')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
  console.log('📚 Swagger documentation: http://localhost:3000/api');
}

bootstrap();
```

## Running the Application

### 1. Apply Migrations

```bash
# Apply admin migrations (automatic)
# Apply your schema migrations
pnpm drizzle-kit migrate
```

### 2. Start the Application

```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

### 3. Test the API

Using curl or Postman:

```bash
# Create a user (set tenant in header)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: company1" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company1.com",
    "password": "securePassword123"
  }'

# Get all users for company1
curl -X GET http://localhost:3000/users \
  -H "x-tenant-id: company1"

# Get all users for company2 (different schema)
curl -X GET http://localhost:3000/users \
  -H "x-tenant-id: company2"
```

## Admin API

The admin module provides endpoints to manage tenants:

```bash
# Create a new tenant
curl -X POST http://localhost:3000/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "company3",
    "code": "company3",
    "status": "active"
  }'

# List all tenants
curl -X GET http://localhost:3000/admin/tenants

# Get tenant info
curl -X GET http://localhost:3000/admin/tenants/company1
```

## Key Concepts Demonstrated

1. **Schema-per-Tenant**: Each company has its own schema (`tenant_company1`, `tenant_company2`)
2. **Tenant Resolution**: Uses `x-tenant-id` header to determine the schema
3. **Type Safety**: Full TypeScript support with Drizzle ORM
4. **Automatic Admin Migrations**: Admin schema managed automatically
5. **Manual Tenant Migrations**: Your schemas controlled via drizzle-kit

## Next Steps

- Read the [Quick Start](/docs/getting-started/quick-start) for more examples
- Learn about [Tenant Resolution](/docs/guides/tenant-resolution) strategies
- Understand [Architecture](/docs/core-concepts/architecture) concepts
- Explore [Advanced Examples](/docs/examples/with-authentication)
