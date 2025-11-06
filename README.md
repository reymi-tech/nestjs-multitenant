# nestjs-multitenant

Una solución completa de multi-tenancy para aplicaciones NestJS
con arquitectura de esquema por tenant (PostgreSQL) y utilidades
para inyección de repositorios, middlewares de resolución de tenant
y configuración tipada.

## Instalación

Instala el paquete y sus peer dependencies requeridas:

```
pnpm add nestjs-multitenant \
  @nestjs/common @nestjs/core @nestjs/config @nestjs/typeorm \
  typeorm reflect-metadata pg
```

> Requisitos: Node.js >= 22, TypeScript >= 5.9, NestJS 11

## Uso rápido

1. Importa el módulo en tu aplicación e inicializa la configuración:

```ts
import { Module } from '@nestjs/common';
import { MultiTenantModule } from 'nestjs-multitenant';

@Module({
  imports: [
    MultiTenantModule.register({
      admin: {
        /* config de conexión admin */
      },
      tenants: {
        /* config multi-tenant */
      },
      platform: 'fastify', // o 'express'
    }),
  ],
})
export class AppModule {}
```

2. Añade el middleware de resolución de tenant (Fastify o Express):

```ts
// Ejemplo Fastify
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TenantFastifyMiddleware } from 'nestjs-multitenant';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(TenantFastifyMiddleware.resolveTenant());
  await app.listen(3000);
}
bootstrap();
```

3. Inyecta repositorios multi-tenant con los decoradores incluidos:

```ts
import { Injectable } from '@nestjs/common';
import { InjectTenantRepository } from 'nestjs-multitenant';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectTenantRepository(User)
    private readonly repo: Repository<User>,
  ) {}
}
```

## Documentación

- Exporta decoradores, providers, servicios, middlewares y DTOs
  desde `nestjs-multitenant`.
- Revisa `src/index.ts` para el API público disponible.

## Scripts

- `node --run build`: Compila TypeScript a `dist/`.
- `node --run test:unit`: Ejecuta las pruebas unitarias con cobertura.
- `npm run publish:public`: Publica el paquete en npm (acceso público).
- `npm run prepublishOnly`: Construye y ejecuta tests antes de publicar.

## Versionado y CHANGELOG

Este proyecto sigue SemVer. Las releases se realizan con mensajes de
commit semánticos y se documentan en `CHANGELOG.md`.

## Licencia

MIT © Reymi Tech
