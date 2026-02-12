# Uso del MultitenantExceptionFilter

Para integrar el ExceptionFilter en tu aplicación NestJS, sigue estos pasos:

## 1. Registro Global del Filter

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { MultitenantExceptionFilter } from 'nestjs-multitenant';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Registrar el exception filter globalmente
  app.useGlobalFilters(new MultitenantExceptionFilter());

  await app.listen(3000);
}
bootstrap();
```

## 2. Registro por Módulo

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MultitenantExceptionFilter } from 'nestjs-multitenant';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: MultitenantExceptionFilter,
    },
  ],
})
export class AppModule {}
```

## 3. Uso de Errores Personalizados

```typescript
import {
  NoTenantContextError,
  InvalidTenantCodeError,
  SchemaNotFoundError,
} from 'nestjs-multitenant';

@Injectable()
export class MyService {
  async someOperation() {
    // Lanzar errores específicos del dominio
    if (!tenantCode) {
      throw new NoTenantContextError(
        'Tenant context required for this operation',
      );
    }

    if (!isValidTenant(tenantCode)) {
      throw new InvalidTenantCodeError(tenantCode);
    }

    if (!(await schemaExists(tenantCode))) {
      throw new SchemaNotFoundError(tenantCode);
    }
  }
}
```

## 4. Respuesta de Error Estructurada

El filter devuelve respuestas consistentes con este formato:

```json
{
  "success": false,
  "error": {
    "code": "UNIQUE_VIOLATION",
    "message": "Resource already exists (unique constraint violation)",
    "category": "DATABASE",
    "statusCode": 409,
    "timestamp": "2023-12-07T10:30:00.000Z",
    "traceId": "mt_1701945000000_abc123def",
    "details": {
      "databaseError": {
        "query": "INSERT INTO users (email) VALUES ($1)",
        "driverError": {
          "code": "23505",
          "detail": "Key (email)=(user@example.com) already exists."
        }
      }
    },
    "request": {
      "method": "POST",
      "url": "/api/users",
      "tenantCode": "tenant1"
    }
  }
}
```

## 5. Headers de Correlación

El filter añade headers automáticos para facilitar el debugging:

- `X-Trace-ID`: Identificador único para correlación de errores
- `X-Tenant-Code`: Código del tenant (si está disponible)

## 6. Categorías de Error

El filter maneja estas categorías principales:

- **DATABASE**: Errores de TypeORM y Drizzle (PostgreSQL)
- **TENANT**: Errores específicos de gestión de tenants
- **CONNECTION**: Errores de conexión y pool
- **VALIDATION**: Errores de validación de datos
- **SYSTEM**: Errores internos del servidor
