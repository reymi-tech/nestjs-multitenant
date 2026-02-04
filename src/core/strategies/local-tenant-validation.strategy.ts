import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Tenant } from '../../admin/entities/tenant.entity';
import { ITenantValidationStrategy } from '../../admin/interfaces/tenant-validation.interface';

@Injectable()
export class LocalTenantValidationStrategy
  implements ITenantValidationStrategy
{
  constructor(
    @InjectRepository(Tenant, 'admin')
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Validates whether a tenant with the specified schema name exists
   *
   * @param schemaName The tenant schema name
   * @returns A promise that resolves to true if the tenant exists, false otherwise
   */
  async validateTenantExists(tenantCode: string): Promise<boolean> {
    const tenant = await this.tenantRepository.findOne({
      where: { code: tenantCode, deletedAt: IsNull() },
    });
    return !!tenant;
  }

  /**
   * Finds a tenant by its code
   *
   * @param code The tenant code
   * @returns A promise that resolves to the tenant entity with the specified code, or null if no tenant is found
   */
  async findByCode(code: string): Promise<Tenant | undefined> {
    const tenant = await this.tenantRepository.findOne({
      where: { code, deletedAt: IsNull() },
    });

    return tenant || undefined;
  }
}
