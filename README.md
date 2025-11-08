# nestjs-multitenant

Una solución completa de multi-tenancy para aplicaciones NestJS
con arquitectura de esquema por tenant (PostgreSQL) y utilidades
para inyección de repositorios, middlewares de resolución de tenant
y configuración tipada.

> **📖 [Read the Full Documentation](https://reymi-tech.github.io/nestjs-multitenant/)** - Comprehensive guides, API reference, and examples

## 🚀 Características

- **Arquitectura Schema-per-Tenant**: Cada tenant tiene su propio esquema de base de datos
- **Resolución Automática de Tenants**: Soporte para múltiples estrategias (header, subdomain, JWT, custom)
- **Pool de Conexiones Dinámico**: Gestión eficiente de conexiones por tenant
- **Inyección de Repositorios**: Decoradores para inyectar repositorios específicos del tenant
- **Administración de Tenants**: Módulo completo para CRUD de tenants
- **Registro de Entidades**: Sistema flexible para configurar entidades por tenant
- **TypeScript**: Completamente tipado con soporte completo de TypeScript
- **Escalable**: Diseñado para aplicaciones de gran escala

## Instalación

Instala el paquete y sus peer dependencies requeridas:

```
pnpm add nestjs-multitenant
```

### Dependencias Peer

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm @nestjs/config typeorm pg
```

> Requisitos: Node.js >= 22, TypeScript >= 5.9, NestJS 11

## 🛠️ Configuración Básica

### 1. Configurar el Módulo Principal (forRoot)

Importa el módulo en tu aplicación e inicializa la configuración:

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MultiTenantModule } from 'nestjs-multitenant';

@Module({
  imports: [
    // ⚠️ IMPORTANTE: ConfigModule debe importarse ANTES que MultiTenantModule
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigService esté disponible globalmente
    }),

    // Configuración de la base de datos principal
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'multitenant_db',
      schema: 'public',
      synchronize: true,
    }),

    // Configuración del módulo multi-tenant
    MultiTenantModule.forRoot({
      database: {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'multitenant_db',
      },
      autoCreateSchemas: true,
      enableAdminModule: true, // Habilita el módulo de administración
      platform: 'express', // express o fastify
    }),
  ],
})
export class AppModule {}
```

### 2. Configuración Asíncrona (forRootAsync)

Para configuraciones más complejas que requieren inyección de dependencias:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MultiTenantModule,
  createDatabaseConfigFromEnv,
} from 'nestjs-multitenant';

@Module({
  imports: [
    // ConfigModule DEBE ser importado ANTES que MultiTenantModule
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Conexión principal de la aplicación
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'multitenant_db',
      schema: 'public',
      synchronize: true,
    }),

    // Configuración asíncrona del módulo multi-tenant
    MultiTenantModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        database: createDatabaseConfigFromEnv(configService),
        autoCreateSchemas: configService.get<boolean>(
          'AUTO_CREATE_SCHEMAS',
          true,
        ),
        enableAdminModule: configService.get<boolean>(
          'ENABLE_ADMIN_MODULE',
          true,
        ),
        platform: configService.get<string>(
          'PLATFORM',
          'express',
        ) as PlatformType, // express o fastify de .env
      }),
    }),
  ],
})
export class AppModule {}
```

**Nota importante sobre forRootAsync:**

- Siempre incluye las funcionalidades de administración (TenantAdminService, TenantAdminController)
- La opción `enableAdminModule` controla si estas funcionalidades están activas en tiempo de ejecución
- La configuración de base de datos admin se toma directamente de las variables de entorno (no del parámetro `database`)
- Es ideal para configuraciones que dependen de variables de entorno o servicios externos

### 3. Registro de Entidades para forRootAsync

Cuando uses `forRootAsync`, es **CRÍTICO** registrar las entidades **ANTES** de que se inicialice el módulo:

```typescript
// entities/index.ts - Crear este archivo PRIMERO
import { EntityRegistry } from 'nestjs-multitenant';
import { User } from './user.entity';
import { Product } from './product.entity';

// IMPORTANTE: Registrar INMEDIATAMENTE al importar
// Opción 1: API fluida (recomendada)
EntityRegistry.getInstance()
  .registerEntity('User', User)
  .registerEntity('Product', Product);

// Opción 2: Registrar múltiples entidades
export const entities = {
  User: User,
  Product: Product,
};
EntityRegistry.getInstance().registerEntities(entities);
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import './entities'; // IMPORTAR PRIMERO para registrar entidades
import { MultiTenantModule } from 'nestjs-multitenant';

@Module({
  imports: [
    // ... otros módulos
    MultiTenantModule.forRootAsync({
      // ... configuración
    }),
  ],
})
export class AppModule {}
```

**⚠️ Problema Común**: Si registras las entidades después de la inicialización del módulo, `getEntityRegistryConfig()` retornará un objeto `entities` vacío.

**✅ Solución**: Siempre importa el archivo de registro de entidades **ANTES** que `MultiTenantModule.forRootAsync`.

**🔍 Debug**: Usa `getEntityRegistryDebugInfo()` para verificar el estado del registro:

```typescript
import { getEntityRegistryDebugInfo } from 'nestjs-multitenant';

// En un endpoint o servicio
const debugInfo = getEntityRegistryDebugInfo();
console.log('Registry state:', debugInfo);
// Output: { entityCount: 2, entities: ['User', 'Product'], presets: ['basic', 'full'] }
```

### 4. Variables de Entorno

```env
# .env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=multitenant_db
TENANT_HEADER=x-tenant-id
AUTO_CREATE_SCHEMAS=true
ENABLE_ADMIN_MODULE=true
```

## 🏗️ Uso del Sistema

### Definir Entidades

```typescript
// entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  createdAt: Date;
}
```

### Registrar Entidades

```typescript
// entities/index.ts
import { EntityRegistry } from 'nestjs-multitenant';
import { User } from './user.entity';
import { Product } from './product.entity';

// Opción 1: Registrar entidades individualmente (API fluida)
EntityRegistry.getInstance()
  .registerEntity('User', User)
  .registerEntity('Product', Product)
  .registerPreset('basic', ['User'])
  .registerPreset('ecommerce', ['User', 'Product']);

// Opción 2: Registrar múltiples entidades a la vez
const entities = {
  User: User,
  Product: Product,
};

EntityRegistry.getInstance()
  .registerEntities(entities)
  .registerPresets({
    basic: ['User'],
    ecommerce: ['User', 'Product'],
  });
```

### Crear un Servicio con Repositorios de Tenant

```typescript
// services/user.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectTenantRepository } from 'nestjs-multitenant';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectTenantRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }
}
```

### Configurar un Módulo de Funcionalidad

```typescript
// modules/user.module.ts
import { Module } from '@nestjs/common';
import { createTenantRepositoryProviders } from 'nestjs-multitenant';
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';

@Module({
  providers: [...createTenantRepositoryProviders([User]), UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
```

## 🔧 Configuración Avanzada

### Estrategias de Resolución de Tenants

- **Header**: Extrae el tenant ID de un encabezado HTTP.
- **Subdominio**: Utiliza el subdominio como tenant ID.
- **Dominio**: Extrae el tenant ID del dominio.
- **Query Parameter**: Obtiene el tenant ID de un parámetro de consulta.

```typescript
MultiTenantModule.forRootAsync({
  tenantResolution: {
    strategy: 'header' | 'subdomain' | 'jwt' | 'custom',
    headerName: 'x-tenant-id', // Encabezado por defecto
    jwtClaimName: 'tenantId', // Claim por defecto en JWT
    customResolver: (request: unknown) => {
      // Lógica personalizada para resolver tenant
      return 'default-tenant';
    },
  },
});
```

**Nota Importante**:

- Si la estrategia de resolución es `header`, asegúrate de que el encabezado exista en la solicitud y definir `headerName` si es diferente de `x-tenant-id`.
- Si la estrategia de resolución es `subdomain`, asegúrate de que el subdominio esté configurado correctamente.
- Si la estrategia de resolución es `jwt`, asegúrate de que el token JWT esté presente y válido; ademas, definir `jwtClaimName` si es diferente de `tenantId`.
- Si la estrategia de resolución es `custom`, asegúrate de proporcionar una función personalizada que devuelva el tenant ID basado en la solicitud.

### Pool de Conexiones

```typescript
MultiTenantModule.forRoot({
  // ... otras configuraciones
  connectionPool: {
    maxConnections: 50,
    idleTimeout: 30000,
    enableCleanup: 30000,
    cleanupInterval: 5000,
  },
});
```

### Configuración de Entidades por Tenant

```typescript
// Configurar entidades disponibles por tenant
EntityRegistry.getInstance()
  .registerPreset('startup', ['User', 'Project'])
  .registerPreset('enterprise', ['User', 'Project', 'Analytics', 'Billing']);
```

## 🔍 Uso Avanzado

### Acceso Directo al DataSource del Tenant

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectTenantDataSource } from 'nestjs-multitenant';

@Injectable()
export class AdvancedService {
  constructor(
    @InjectTenantDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async executeRawQuery(query: string) {
    return this.dataSource.query(query);
  }

  async runTransaction(callback: (manager: EntityManager) => Promise<any>) {
    return this.dataSource.transaction(callback);
  }
}
```

### Factory de Repositorios

```typescript
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectTenantRepositoryFactory } from 'nestjs-multitenant';
import { User } from '../entities/user.entity';

@Injectable()
export class MultiTenantService {
  constructor(
    @InjectTenantRepositoryFactory(User)
    private readonly userRepositoryFactory: (
      tenantId: string,
    ) => Promise<Repository<User>>,
  ) {}

  async getUsersFromSpecificTenant(tenantId: string) {
    const userRepository = await this.userRepositoryFactory(tenantId);
    return userRepository.find();
  }
}
```

## 🔧 Resolución de Problemas

### Error: "Nest can't resolve dependencies of the TypeOrmModuleOptions"

**Problema**: Error al inicializar el módulo con el mensaje:

```
UnknownDependenciesException [Error]: Nest can't resolve dependencies of the TypeOrmModuleOptions (?).
Please make sure that the argument ConfigService at index [0] is available in the TypeOrmCoreModule context.
```

**Solución**: Este error ocurre cuando `ConfigModule` no está disponible en el contexto del módulo. Asegúrate de:

1. **Importar ConfigModule ANTES que MultiTenantModule**:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ⚠️ DEBE ir ANTES
    MultiTenantModule.forRoot({ /* config */ }),
  ],
})
```

2. **Usar configuración global**:

```typescript
ConfigModule.forRoot({
  isGlobal: true, // Hace ConfigService disponible globalmente
});
```

3. **Para configuración asíncrona, inyectar ConfigService correctamente**:

```typescript
MultiTenantModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    // configuración
  }),
});
```

### Error: "Cannot find module 'nestjs-multitenant'"

**Solución**: Instala las dependencias requeridas:

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm @nestjs/config typeorm pg
```

### Problemas de Conexión a Base de Datos

**Problema**: Errores de conexión o timeout.

**Solución**: Verifica la configuración de la base de datos y asegúrate de que PostgreSQL esté ejecutándose:

```typescript
MultiTenantModule.forRoot({
  database: {
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'multitenant_db',
    // Opcional: configuración adicional
    ssl: false,
    synchronize: true, // Solo en desarrollo
    logging: true, // Para debug
  },
});
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Versionado y CHANGELOG

Este proyecto sigue SemVer. Las releases se realizan con mensajes de
commit semánticos y se documentan en `CHANGELOG.md`.

## 🆘 Soporte

- 📧 Email: lmorochofebres@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/reymi-tech/nestjs-multitenant/issues)
- 📖 Documentación: [Docs](https://github.com/reymi-tech/nestjs-multitenant#readme)

## Licencia

MIT © Reymi Tech
