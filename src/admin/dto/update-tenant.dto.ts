import { PartialType } from '@nestjs/mapped-types';

import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  /**
   * Code cannot be update after creation
   */
  code?: never;
}
