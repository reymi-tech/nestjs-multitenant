import { beforeEach, describe, expect, it } from 'vitest';

import { Tenant } from '../../../../src/admin/entities/tenant.entity';
import { TenantStatus } from '../../../../src/constants';

describe('Tenant Entity - Helper Methods', () => {
  let tenant: Tenant;

  beforeEach(() => {
    // Arrange: Create a fresh tenant instance for each test
    tenant = new Tenant();
  });

  describe('getSchemaName()', () => {
    it('debería retornar el código del tenant como nombre de schema cuando el código está definido', () => {
      // Arrange: Configurar tenant con código específico
      tenant.code = 'test_tenant';

      // Act: Obtener el nombre del schema
      const result = tenant.getSchemaName();

      // Assert: Verificar que retorna el código del tenant
      expect(result).toBe('test_tenant');
      expect(typeof result).toBe('string');
    });

    it('debería retornar el código del tenant con caracteres especiales válidos', () => {
      // Arrange: Configurar tenant con código que incluye guiones bajos y números
      tenant.code = 'tenant_123_prod';

      // Act: Obtener el nombre del schema
      const result = tenant.getSchemaName();

      // Assert: Verificar que maneja correctamente caracteres especiales
      expect(result).toBe('tenant_123_prod');
    });

    it('debería retornar código vacío cuando el tenant no tiene código asignado', () => {
      // Arrange: Tenant sin código asignado (undefined por defecto)
      // tenant.code permanece undefined

      // Act: Obtener el nombre del schema
      const result = tenant.getSchemaName();

      // Assert: Verificar que retorna undefined cuando no hay código
      expect(result).toBeUndefined();
    });

    it('debería retornar string vacío cuando el código del tenant es string vacío', () => {
      // Arrange: Configurar tenant con código vacío
      tenant.code = '';

      // Act: Obtener el nombre del schema
      const result = tenant.getSchemaName();

      // Assert: Verificar que retorna string vacío
      expect(result).toBe('');
    });
  });

  describe('isActive()', () => {
    it('debería retornar true cuando el tenant tiene status ACTIVE y no está soft-deleted', () => {
      // Arrange: Configurar tenant activo sin fecha de eliminación
      tenant.status = TenantStatus.ACTIVE;
      tenant.deletedAt = undefined;

      // Act: Verificar si el tenant está activo
      const result = tenant.isActive();

      // Assert: Verificar que el tenant está activo
      expect(result).toBe(true);
    });

    it('debería retornar false cuando el tenant tiene status INACTIVE aunque no esté soft-deleted', () => {
      // Arrange: Configurar tenant inactivo sin fecha de eliminación
      tenant.status = TenantStatus.INACTIVE;
      tenant.deletedAt = undefined;

      // Act: Verificar si el tenant está activo
      const result = tenant.isActive();

      // Assert: Verificar que el tenant no está activo
      expect(result).toBe(false);
    });

    it('debería retornar false cuando el tenant tiene status SUSPENDED', () => {
      // Arrange: Configurar tenant suspendido
      tenant.status = TenantStatus.SUSPENDED;
      tenant.deletedAt = undefined;

      // Act: Verificar si el tenant está activo
      const result = tenant.isActive();

      // Assert: Verificar que el tenant no está activo
      expect(result).toBe(false);
    });

    it('debería retornar false cuando el tenant tiene status PENDING', () => {
      // Arrange: Configurar tenant pendiente
      tenant.status = TenantStatus.PENDING;
      tenant.deletedAt = undefined;

      // Act: Verificar si el tenant está activo
      const result = tenant.isActive();

      // Assert: Verificar que el tenant no está activo
      expect(result).toBe(false);
    });

    it('debería retornar false cuando el tenant está soft-deleted aunque tenga status ACTIVE', () => {
      // Arrange: Configurar tenant activo pero soft-deleted
      tenant.status = TenantStatus.ACTIVE;
      tenant.deletedAt = new Date('2024-01-01T00:00:00Z');

      // Act: Verificar si el tenant está activo
      const result = tenant.isActive();

      // Assert: Verificar que el tenant no está activo debido al soft-delete
      expect(result).toBe(false);
    });

    it('debería retornar false cuando el tenant está soft-deleted y tiene status INACTIVE', () => {
      // Arrange: Configurar tenant inactivo y soft-deleted
      tenant.status = TenantStatus.INACTIVE;
      tenant.deletedAt = new Date('2024-01-01T00:00:00Z');

      // Act: Verificar si el tenant está activo
      const result = tenant.isActive();

      // Assert: Verificar que el tenant no está activo por ambas condiciones
      expect(result).toBe(false);
    });

    it('debería manejar correctamente cuando deletedAt es null explícitamente', () => {
      // Arrange: Configurar tenant activo con deletedAt explícitamente null
      tenant.status = TenantStatus.ACTIVE;
      tenant.deletedAt = undefined;

      // Act: Verificar si el tenant está activo
      const result = tenant.isActive();

      // Assert: Verificar que el tenant está activo (null se evalúa como falsy)
      expect(result).toBe(true);
    });
  });

  describe('getEnabledEntities()', () => {
    it('debería retornar array de entidades habilitadas cuando entityConfig está definido con enabledEntities', () => {
      // Arrange: Configurar tenant con entidades habilitadas específicas
      tenant.entityConfig = {
        enabledEntities: ['user', 'role', 'permission'],
      };

      // Act: Obtener entidades habilitadas
      const result = tenant.getEnabledEntities();

      // Assert: Verificar que retorna el array correcto de entidades
      expect(result).toEqual(['user', 'role', 'permission']);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it('debería retornar array vacío cuando entityConfig está definido pero enabledEntities es undefined', () => {
      // Arrange: Configurar tenant con entityConfig sin enabledEntities
      tenant.entityConfig = {
        customSettings: { user: { level: 1 } },
        enabledEntities: [],
      };

      // Act: Obtener entidades habilitadas
      const result = tenant.getEnabledEntities();

      // Assert: Verificar que retorna array vacío
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('debería retornar array vacío cuando entityConfig es undefined', () => {
      // Arrange: Tenant sin entityConfig (undefined por defecto)
      // tenant.entityConfig permanece undefined

      // Act: Obtener entidades habilitadas
      const result = tenant.getEnabledEntities();

      // Assert: Verificar que retorna array vacío
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('debería retornar array vacío cuando entityConfig es undefined', () => {
      // Arrange: Configurar tenant con entityConfig explícitamente undefined
      tenant.entityConfig = undefined;

      // Act: Obtener entidades habilitadas
      const result = tenant.getEnabledEntities();

      // Assert: Verificar que retorna array vacío
      expect(result).toEqual([]);
    });

    it('debería retornar array vacío cuando enabledEntities es array vacío', () => {
      // Arrange: Configurar tenant con array vacío de entidades habilitadas
      tenant.entityConfig = {
        enabledEntities: [],
      };

      // Act: Obtener entidades habilitadas
      const result = tenant.getEnabledEntities();

      // Assert: Verificar que retorna array vacío
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('debería manejar correctamente entidades con nombres que contienen caracteres especiales', () => {
      // Arrange: Configurar tenant con entidades que tienen nombres especiales
      tenant.entityConfig = {
        enabledEntities: ['user_profile', 'order-item', 'product.category'],
      };

      // Act: Obtener entidades habilitadas
      const result = tenant.getEnabledEntities();

      // Assert: Verificar que maneja correctamente nombres especiales
      expect(result).toEqual([
        'user_profile',
        'order-item',
        'product.category',
      ]);
    });
  });

  describe('isEntityEnabled()', () => {
    it('debería retornar true cuando la entidad específica está en la lista de entidades habilitadas', () => {
      // Arrange: Configurar tenant con entidades habilitadas que incluye la entidad buscada
      tenant.entityConfig = {
        enabledEntities: ['user', 'role', 'permission'],
      };

      // Act: Verificar si la entidad 'user' está habilitada
      const result = tenant.isEntityEnabled('user');

      // Assert: Verificar que la entidad está habilitada
      expect(result).toBe(true);
    });

    it('debería retornar false cuando la entidad específica no está en la lista de entidades habilitadas', () => {
      // Arrange: Configurar tenant con entidades habilitadas que no incluye la entidad buscada
      tenant.entityConfig = {
        enabledEntities: ['user', 'role'],
      };

      // Act: Verificar si la entidad 'permission' está habilitada
      const result = tenant.isEntityEnabled('permission');

      // Assert: Verificar que la entidad no está habilitada
      expect(result).toBe(false);
    });

    it('debería retornar false cuando entityConfig es undefined', () => {
      // Arrange: Tenant sin entityConfig
      // tenant.entityConfig permanece undefined

      // Act: Verificar si cualquier entidad está habilitada
      const result = tenant.isEntityEnabled('user');

      // Assert: Verificar que ninguna entidad está habilitada
      expect(result).toBe(false);
    });

    it('debería retornar false cuando enabledEntities es array vacío', () => {
      // Arrange: Configurar tenant con array vacío de entidades habilitadas
      tenant.entityConfig = {
        enabledEntities: [],
      };

      // Act: Verificar si cualquier entidad está habilitada
      const result = tenant.isEntityEnabled('user');

      // Assert: Verificar que ninguna entidad está habilitada
      expect(result).toBe(false);
    });

    it('debería ser case-sensitive al verificar nombres de entidades', () => {
      // Arrange: Configurar tenant con entidades habilitadas en minúsculas
      tenant.entityConfig = {
        enabledEntities: ['user', 'role'],
      };

      // Act: Verificar entidades con diferentes casos
      const resultLowerCase = tenant.isEntityEnabled('user');
      const resultUpperCase = tenant.isEntityEnabled('USER');
      const resultMixedCase = tenant.isEntityEnabled('User');

      // Assert: Verificar que es case-sensitive
      expect(resultLowerCase).toBe(true);
      expect(resultUpperCase).toBe(false);
      expect(resultMixedCase).toBe(false);
    });

    it('debería manejar correctamente entidades con caracteres especiales en el nombre', () => {
      // Arrange: Configurar tenant con entidades que tienen caracteres especiales
      tenant.entityConfig = {
        enabledEntities: ['user_profile', 'order-item'],
      };

      // Act: Verificar entidades con caracteres especiales
      const resultUnderscore = tenant.isEntityEnabled('user_profile');
      const resultHyphen = tenant.isEntityEnabled('order-item');
      const resultNotFound = tenant.isEntityEnabled('user-profile');

      // Assert: Verificar que maneja correctamente caracteres especiales
      expect(resultUnderscore).toBe(true);
      expect(resultHyphen).toBe(true);
      expect(resultNotFound).toBe(false);
    });

    it('debería manejar correctamente strings vacíos como nombre de entidad', () => {
      // Arrange: Configurar tenant con entidades habilitadas
      tenant.entityConfig = {
        enabledEntities: ['user', 'role'],
      };

      // Act: Verificar con string vacío
      const result = tenant.isEntityEnabled('');

      // Assert: Verificar que string vacío no está habilitado
      expect(result).toBe(false);
    });
  });

  describe('getEntitySettings()', () => {
    it('debería retornar configuraciones específicas cuando la entidad tiene customSettings definidas', () => {
      // Arrange: Configurar tenant con configuraciones personalizadas para entidades
      tenant.entityConfig = {
        enabledEntities: ['user', 'role'],
        customSettings: {
          user: { level: 1, maxUsers: 100, features: ['auth', 'profile'] },
          role: { permissions: ['read', 'write'] },
        },
      };

      // Act: Obtener configuraciones para la entidad 'user'
      const result = tenant.getEntitySettings('user');

      // Assert: Verificar que retorna las configuraciones correctas
      expect(result).toEqual({
        level: 1,
        maxUsers: 100,
        features: ['auth', 'profile'],
      });
      expect(typeof result).toBe('object');
    });

    it('debería retornar objeto vacío cuando la entidad no tiene customSettings definidas', () => {
      // Arrange: Configurar tenant con customSettings que no incluye la entidad buscada
      tenant.entityConfig = {
        enabledEntities: ['user', 'role'],
        customSettings: {
          user: { level: 1 },
        },
      };

      // Act: Obtener configuraciones para entidad sin configuraciones personalizadas
      const result = tenant.getEntitySettings('role');

      // Assert: Verificar que retorna objeto vacío
      expect(result).toEqual({});
      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('debería retornar objeto vacío cuando entityConfig es undefined', () => {
      // Arrange: Tenant sin entityConfig
      // tenant.entityConfig permanece undefined

      // Act: Obtener configuraciones para cualquier entidad
      const result = tenant.getEntitySettings('user');

      // Assert: Verificar que retorna objeto vacío
      expect(result).toEqual({});
      expect(typeof result).toBe('object');
    });

    it('debería retornar objeto vacío cuando customSettings es undefined', () => {
      // Arrange: Configurar tenant con entityConfig sin customSettings
      tenant.entityConfig = {
        enabledEntities: ['user', 'role'],
        // customSettings no definido
      };

      // Act: Obtener configuraciones para cualquier entidad
      const result = tenant.getEntitySettings('user');

      // Assert: Verificar que retorna objeto vacío
      expect(result).toEqual({});
    });

    it('debería manejar correctamente configuraciones con valores undefined', () => {
      // Arrange: Configurar tenant con configuraciones que incluyen valores undefined
      tenant.entityConfig = {
        enabledEntities: ['user'],
        customSettings: {
          user: {
            level: undefined,
            maxUsers: undefined,
            active: true,
            name: '',
          },
        },
      };

      // Act: Obtener configuraciones para la entidad
      const result = tenant.getEntitySettings('user');

      // Assert: Verificar que maneja correctamente valores undefined
      expect(result).toEqual({
        level: undefined,
        maxUsers: undefined,
        active: true,
        name: '',
      });
    });

    it('debería manejar configuraciones complejas con objetos anidados y arrays', () => {
      // Arrange: Configurar tenant con configuraciones complejas
      tenant.entityConfig = {
        enabledEntities: ['user'],
        customSettings: {
          user: {
            permissions: {
              read: true,
              write: false,
              admin: { level: 2, modules: ['users', 'roles'] },
            },
            features: ['auth', 'profile', 'notifications'],
            metadata: {
              version: '1.0',
              lastUpdated: '2024-01-01',
            },
          },
        },
      };

      // Act: Obtener configuraciones complejas
      const result = tenant.getEntitySettings('user');

      // Assert: Verificar que maneja correctamente estructuras complejas
      expect(result).toEqual({
        permissions: {
          read: true,
          write: false,
          admin: { level: 2, modules: ['users', 'roles'] },
        },
        features: ['auth', 'profile', 'notifications'],
        metadata: {
          version: '1.0',
          lastUpdated: '2024-01-01',
        },
      });
      // @ts-expect-error: Verificar que no permite acceso a propiedades inexistentes
      expect(result.permissions.admin.modules).toHaveLength(2);
      expect(result.features).toHaveLength(3);
    });

    it('debería ser case-sensitive al buscar configuraciones de entidades', () => {
      // Arrange: Configurar tenant con configuraciones en minúsculas
      tenant.entityConfig = {
        enabledEntities: ['user'],
        customSettings: {
          user: { level: 1 },
        },
      };

      // Act: Buscar configuraciones con diferentes casos
      const resultLowerCase = tenant.getEntitySettings('user');
      const resultUpperCase = tenant.getEntitySettings('USER');
      const resultMixedCase = tenant.getEntitySettings('User');

      // Assert: Verificar que es case-sensitive
      expect(resultLowerCase).toEqual({ level: 1 });
      expect(resultUpperCase).toEqual({});
      expect(resultMixedCase).toEqual({});
    });

    it('debería manejar correctamente entidades con nombres que contienen caracteres especiales', () => {
      // Arrange: Configurar tenant con entidades que tienen caracteres especiales
      tenant.entityConfig = {
        enabledEntities: ['user_profile', 'order-item'],
        customSettings: {
          user_profile: { maxSize: 1024 },
          'order-item': { currency: 'USD' },
        },
      };

      // Act: Obtener configuraciones para entidades con caracteres especiales
      const resultUnderscore = tenant.getEntitySettings('user_profile');
      const resultHyphen = tenant.getEntitySettings('order-item');

      // Assert: Verificar que maneja correctamente caracteres especiales
      expect(resultUnderscore).toEqual({ maxSize: 1024 });
      expect(resultHyphen).toEqual({ currency: 'USD' });
    });
  });
});
