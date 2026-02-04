import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock parcial de Nest para observar el token generado por nuestros decoradores
vi.mock('@nestjs/common', async importOriginal => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Inject: vi.fn((token: string) => ({ __decorator: true, token })),
  };
});

// Importar después del mock para que use el Inject simulado
import { Inject } from '@nestjs/common';

import {
  InjectTenantDataSource,
  InjectTenantRepository,
  InjectTenantRepositoryFactory,
} from '../../../../src/core/decorators/inject-tenant-repository.decorator';

describe('InjectTenant decorators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('InjectTenantRepository usa token correcto para entidad por nombre', () => {
    const decorator = InjectTenantRepository('User' as any);
    expect(Inject).toHaveBeenCalledWith('TENANT_REPOSITORY_User');
    expect(decorator).toEqual({
      __decorator: true,
      token: 'TENANT_REPOSITORY_User',
    });
  });

  it('InjectTenantRepository usa token correcto para clase con name', () => {
    const entity = { name: 'Order' } as any;
    const decorator = InjectTenantRepository(entity);
    expect(Inject).toHaveBeenCalledWith('TENANT_REPOSITORY_Order');
    expect(decorator).toEqual({
      __decorator: true,
      token: 'TENANT_REPOSITORY_Order',
    });
  });

  it('InjectTenantRepository usa token correcto para entidad con options.name', () => {
    const entity = { options: { name: 'Audit' } } as any;
    const decorator = InjectTenantRepository(entity);
    expect(Inject).toHaveBeenCalledWith('TENANT_REPOSITORY_Audit');
    expect(decorator).toEqual({
      __decorator: true,
      token: 'TENANT_REPOSITORY_Audit',
    });
  });

  it('InjectTenantDataSource usa token TENANT_DATA_SOURCE', () => {
    const decorator = InjectTenantDataSource();
    expect(Inject).toHaveBeenCalledWith('TENANT_DATA_SOURCE');
    expect(decorator).toEqual({
      __decorator: true,
      token: 'TENANT_DATA_SOURCE',
    });
  });

  it('InjectTenantRepositoryFactory usa token con sufijo _FACTORY', () => {
    const decorator = InjectTenantRepositoryFactory('User' as any);
    expect(Inject).toHaveBeenCalledWith('TENANT_REPOSITORY_User_FACTORY');
    expect(decorator).toEqual({
      __decorator: true,
      token: 'TENANT_REPOSITORY_User_FACTORY',
    });

    const entity = { name: 'Order' } as any;
    const decorator2 = InjectTenantRepositoryFactory(entity);
    expect(Inject).toHaveBeenCalledWith('TENANT_REPOSITORY_Order_FACTORY');
    expect(decorator2).toEqual({
      __decorator: true,
      token: 'TENANT_REPOSITORY_Order_FACTORY',
    });
  });
});
