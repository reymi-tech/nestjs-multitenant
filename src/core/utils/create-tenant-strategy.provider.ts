import { Provider, Type } from '@nestjs/common';

import {
  ITenantAdminService,
  TENANT_ADMIN_SERVICE,
} from '../../admin/interfaces/tenant-admin.interface';

/**
 * Valida en tiempo de compilación que el servicio proporcionado
 * implementa el contrato completo de ITenantAdminService.
 *
 * Uso:
 *   managementStrategyProvider: createTenantStrategyProvider(CustomTenantAdminService)
 */
export function createTenantStrategyProvider(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strategyClass: new (...args: any[]) => ITenantAdminService,
): Provider {
  return {
    provide: TENANT_ADMIN_SERVICE,
    useClass: strategyClass as Type<ITenantAdminService>,
  };
}
