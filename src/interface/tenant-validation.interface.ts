import { Tenant } from '../modules/entities/tenant.entity';

export interface ITenantValidationStrategy {
  validateTenantExists(tenantCode: string): Promise<boolean>;
  findByCode(code: string): Promise<Tenant | undefined>;
}

export const TENANT_VALIDATION_STRATEGY = Symbol('ITenantValidationStrategy');
