import { Tenant } from '../../admin/entities/tenant.entity';
import { Tenant as TenantSchema } from '../../admin/schema/tenant.schema';

export interface ITenantValidationStrategy {
  validateTenantExists(tenantCode: string): Promise<boolean>;
  findByCode(code: string): Promise<Tenant | TenantSchema | undefined>;
}

export const TENANT_VALIDATION_STRATEGY = Symbol('ITenantValidationStrategy');
