import type { EntityTarget } from 'typeorm';

import { EntityRegistry } from '../config/entity.registry';
import { EntityName, TenantPreset } from '../constants';
import {
  EntityRegistryConfig,
  EntityValidationResult,
} from '../modules/interface/entity-registry.interface';

/**
 * Validate that the specified entity names exist in the registry
 *
 * @param entityNames Entity names to validate
 * @returns Validation result containing valid and invalid entity names
 */
export function validateEntityNames(
  entityNames: string[],
): EntityValidationResult {
  const registry = EntityRegistry.getInstance();
  const valid: EntityName[] = [];
  const invalid: string[] = [];

  for (const entityName of entityNames) {
    if (registry.hasEntity(entityName)) {
      valid.push(entityName as EntityName);
    } else {
      invalid.push(entityName);
    }
  }

  return { valid, invalid };
}

/**
 * Get entity classes based on entity names
 *
 * @param entityNames Entity names to resolve
 * @returns Array of entity targets (TypeORM Entity class) or string identifiers
 */
export function getEntityClasses(
  entityNames: EntityName[],
): Array<EntityTarget<unknown> | string> {
  const registry = EntityRegistry.getInstance();
  return entityNames
    .map(name => registry.getEntity(name))
    .filter(entity => entity !== undefined) as Array<
    EntityTarget<unknown> | string
  >;
}

/**
 * Configure the entity registry with entities and presets
 *
 * @param config Entity registry configuration
 */
export function configureEntityRegistry(config: EntityRegistryConfig): void {
  const registry = EntityRegistry.getInstance();
  registry.registerEntities(config.entities);
  registry.registerPresets(config.presets);
}

/**
 * Get entity registry configuration
 * Returns entity names instead of classes for JSON serialization
 *
 * @returns Entity registry configuration
 */
export function getEntityRegistryConfig(): EntityRegistryConfig {
  const registry = EntityRegistry.getInstance();
  const allEntities = registry.getAllEntities();

  // Convert entity classes to serializable format
  const serializableEntities: Record<string, string> = {};
  for (const key of Object.keys(allEntities)) {
    const value = allEntities[key];
    if (typeof value === 'string') {
      serializableEntities[key] = value;
    } else if ('name' in value && typeof value.name === 'string') {
      serializableEntities[key] = value.name;
    } else {
      serializableEntities[key] = key;
    }
  }

  return {
    entities: serializableEntities,
    presets: registry.getAllPresets(),
  };
}

/**
 * Debug function to check entity registry state
 * Useful for troubleshooting entity registration issues
 *
 * @returns Entity registry debug information
 */
export function getEntityRegistryDebugInfo(): {
  entityCount: number;
  entities: EntityName[];
  presets: TenantPreset[];
} {
  const registry = EntityRegistry.getInstance();
  return registry.getRegistryState();
}
