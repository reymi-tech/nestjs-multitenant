import { EntityName, TenantPreset } from '../constants';

export interface EntityRegistryConfig {
  entities: Record<string, string>; // Entity name -> Entity class name mapping
  presets: Record<TenantPreset, EntityName[]>;
  defaultPreset?: TenantPreset;
}

/**
 * Entity validation result
 */
export interface EntityValidationResult {
  valid: EntityName[];
  invalid: string[];
}
