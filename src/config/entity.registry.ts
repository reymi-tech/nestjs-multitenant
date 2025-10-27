import type { EntityTarget } from 'typeorm';

import {
  DEFAULT_TENANT_ENTITY_PRESETS,
  EntityName,
  REGEX_FORMAT_KEY_TO_ENTITY_NAME,
  TenantPreset,
} from 'src/constants';

export type EntityRegistryType = Record<
  EntityName,
  EntityTarget<unknown> | string
>;

/**
 * Entity Registry class for managing tenant entities
 */
export class EntityRegistry {
  private static instance: EntityRegistry;
  // Registry stores either a TypeORM Entity target (class) or a string identifier
  private entityRegistry: EntityRegistryType = {};
  private entityPresets: Record<TenantPreset, EntityName[]> = {
    ...DEFAULT_TENANT_ENTITY_PRESETS,
  };
  private constructor() {}

  /**
   * Get the singleton instance of the EntityRegistry
   * @returns The EntityRegistry instance
   */
  static getInstance(): EntityRegistry {
    if (!EntityRegistry.instance) {
      EntityRegistry.instance = new EntityRegistry();
    }
    return EntityRegistry.instance;
  }

  /**
   * Register a single entity with the registry
   * @param name - The name of the entity to register
   * @param entity - The entity class to register (TypeORM Entity target or string)
   * @returns The EntityRegistry instance
   */
  registerEntity(
    name: string,
    entity: EntityTarget<unknown> | string,
  ): EntityRegistry {
    const newName = this.formatKeyToEntityName(name);
    this.entityRegistry[newName] = entity;
    this.entityPresets.full = Object.keys(this.entityRegistry) as EntityName[];
    return this;
  }

  registerEntities(
    entities: Record<string, EntityTarget<unknown> | string>,
  ): EntityRegistry {
    const formattedEntities: Record<
      EntityName,
      EntityTarget<unknown> | string
    > = {};
    for (const [key, value] of Object.entries(entities)) {
      const formattedKey = this.formatKeyToEntityName(key);
      formattedEntities[formattedKey] = value;
    }

    this.entityRegistry = { ...this.entityRegistry, ...formattedEntities };

    this.entityPresets.full = Object.keys(this.entityRegistry) as EntityName[];
    return this;
  }

  registerPreset(name: TenantPreset, entities: EntityName[]): EntityRegistry {
    this.entityPresets[name] = entities;
    return this;
  }

  registerPresets(presets: Record<TenantPreset, EntityName[]>): EntityRegistry {
    this.entityPresets = { ...this.entityPresets, ...presets };
    return this;
  }

  getEntity(name: string): EntityTarget<unknown> | string | undefined {
    return this.entityRegistry[name as EntityName];
  }

  getAllEntities(): EntityRegistryType {
    return { ...this.entityRegistry };
  }

  getRegistryState(): {
    entityCount: number;
    entities: EntityName[];
    presets: TenantPreset[];
  } {
    return {
      entityCount: Object.keys(this.entityRegistry).length,
      entities: Object.keys(this.entityRegistry) as EntityName[],
      presets: Object.keys(this.entityPresets) as TenantPreset[],
    };
  }

  getPreset(presetName: TenantPreset): EntityName[] {
    return this.entityPresets[presetName] || [];
  }

  getAllPresets(): Record<TenantPreset, EntityName[]> {
    return { ...this.entityPresets };
  }

  hasEntity(name: string): boolean {
    return name in this.entityRegistry;
  }

  getEntityNames(): EntityName[] {
    return Object.keys(this.entityRegistry) as EntityName[];
  }

  getPresetNames(): TenantPreset[] {
    return Object.keys(this.entityPresets) as TenantPreset[];
  }

  private formatKeyToEntityName(key: string): EntityName {
    return key
      .replace(REGEX_FORMAT_KEY_TO_ENTITY_NAME, '$1_$2')
      .toLowerCase() as EntityName;
  }
}
