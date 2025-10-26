/**
 * Entity name type (will be extended by implementations)
 */
export type EntityName = string;

/**
 * Tenant status
 */
export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export const REGEX_TENANT_NAME = /^[a-z0-9_]+$/;
