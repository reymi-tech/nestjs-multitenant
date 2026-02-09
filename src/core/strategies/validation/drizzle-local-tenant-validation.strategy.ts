import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { type Tenant, tenants } from '../../../admin/schema/tenant.schema';
import { ADMIN_DATABASE } from '../../../admin/services/drizzle-tenant-admin.service';
import { ITenantValidationStrategy } from '../../interfaces/tenant-validation.interface';

/**
 * Local tenant validation strategy using Drizzle ORM
 * Validates tenants against the admin database
 */
@Injectable()
export class DrizzleLocalTenantValidationStrategy
  implements ITenantValidationStrategy
{
  constructor(
    @Inject(ADMIN_DATABASE)
    private readonly db: NodePgDatabase,
  ) {}

  /**
   * Validates whether a tenant with the specified schema name exists
   *
   * @param tenantCode The tenant schema name
   * @returns A promise that resolves to true if the tenant exists, false otherwise
   */
  async validateTenantExists(tenantCode: string): Promise<boolean> {
    const [tenant] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.code, tenantCode), isNull(tenants.deletedAt)))
      .limit(1);

    return !!tenant;
  }

  /**
   * Finds a tenant by its code
   *
   * @param code The tenant code
   * @returns A promise that resolves to the tenant entity with the specified code, or undefined if no tenant is found
   */
  async findByCode(code: string): Promise<Tenant | undefined> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.code, code), isNull(tenants.deletedAt)))
      .limit(1);

    return tenant || undefined;
  }
}
