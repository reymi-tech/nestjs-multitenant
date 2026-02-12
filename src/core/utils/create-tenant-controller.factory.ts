import { Type } from '@nestjs/common';

import { ITenantAdminController } from '../../admin/interfaces/tenant-admin.interface';

/**
 * Valida en tiempo de compilación que el controller proporcionado
 * implementa el contrato completo de ITenantAdminController.
 *
 * Uso:
 *   additionalControllers: [createTenantControllerFactory(CustomTenantAdminController)]
 */
export function createTenantControllerFactory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controllerClass: new (...args: any[]) => ITenantAdminController,
): Type<ITenantAdminController> {
  return controllerClass as Type<ITenantAdminController>;
}
