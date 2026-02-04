import { Provider } from '@nestjs/common';

import { ITenantAdminService } from '../../admin/interfaces/tenant-admin.interface';
import { TENANT_MANAGEMENT_STRATEGY } from '../../admin/interfaces/tenant-management.interface';

export function createTenantStrategyProvider(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strategyClass: new (...args: any[]) => ITenantAdminService,
): Provider {
  return {
    provide: TENANT_MANAGEMENT_STRATEGY,
    useClass: strategyClass,
  };
}
