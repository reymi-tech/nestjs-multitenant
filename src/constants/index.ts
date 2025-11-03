/**
 * Entity name type (will be extended by implementations)
 */
export type EntityName = string;

/**
 * Tenant preset type (will be extended by implementations)
 */
export type TenantPreset = string;

/**
 * Tenant status
 */
export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

/**
 * Regular expression for validating tenant names
 */
export const REGEX_TENANT_NAME = /^[a-z0-9_]+$/;

/**
 * Default presets for tenant entity configurations
 */
export const DEFAULT_TENANT_ENTITY_PRESETS = {
  basic: ['user', 'role'] as EntityName[],
  userOnly: ['user'] as EntityName[],
  roleOnly: ['role'] as EntityName[],
  full: [] as EntityName[], // Will be populated dynamically
} as const;

/**
 * Regular expression for formatting keys to entity names
 */
export const REGEX_FORMAT_KEY_TO_ENTITY_NAME = /([a-z])([A-Z])/g;
