import { beforeEach, describe, expect, it } from 'vitest';

import {
  //   configureEntityRegistry,
  //   DEFAULT_TENANT_ENTITY_PRESETS,
  EntityRegistry,
} from '../../../src/config/entity.registry';
import { DEFAULT_TENANT_ENTITY_PRESETS } from '../../../src/constants';
import {
  configureEntityRegistry,
  getEntityClasses,
  getEntityRegistryConfig,
  getEntityRegistryDebugInfo,
  validateEntityNames,
} from '../../../src/utils/entity-registry.utils';

class DummyUser {}
class DummyRole {}
class AnotherEntity {}

describe('EntityRegistry', () => {
  beforeEach(() => {
    // Reset singleton by re-initializing internal state via methods
    const reg = EntityRegistry.getInstance();
    // Emulate reset by registering empty to override
    // There's no explicit reset; ensure consistent start using unique keys
    // Register a baseline set each test will assert incrementally
    reg.registerEntities({});
    reg.registerPresets({});
  });

  it('registers single entity and formats name', () => {
    const reg = EntityRegistry.getInstance();
    reg.registerEntity('UserEntity', DummyUser);
    expect(reg.getEntity('user_entity')).toBe(DummyUser);
    expect(reg.getEntityNames()).toContain('user_entity');
    expect(reg.getPreset('full')).toContain('user_entity');
  });

  it('registers multiple entities with formatted keys', () => {
    const reg = EntityRegistry.getInstance();
    reg.registerEntities({ User: DummyUser, Role: DummyRole });
    expect(reg.getEntity('user')).toBe(DummyUser);
    expect(reg.getEntity('role')).toBe(DummyRole);
    expect(reg.getPreset('full')).toEqual(
      expect.arrayContaining(['user', 'role']),
    );
  });

  it('manages presets add/get/has', () => {
    const reg = EntityRegistry.getInstance();
    reg.registerPreset('custom', ['user']);
    expect(reg.getPreset('custom')).toEqual(['user']);
    expect(reg.getPresetNames()).toEqual(
      expect.arrayContaining(Object.keys(DEFAULT_TENANT_ENTITY_PRESETS)),
    );
  });

  it('getRegistryState returns counts and names', () => {
    const reg = EntityRegistry.getInstance();
    reg.registerEntities({ User: DummyUser, Role: DummyRole });
    const state = reg.getRegistryState();
    expect(state.entityCount).toBeGreaterThanOrEqual(2);
    expect(state.entities).toEqual(expect.arrayContaining(['user', 'role']));
    expect(state.presets.length).toBeGreaterThan(0);
  });

  it('validateEntityNames returns valid and invalid', () => {
    const reg = EntityRegistry.getInstance();
    reg.registerEntities({ User: DummyUser, Role: class Role {} });
    const res = validateEntityNames(['user', 'role']);
    expect(res.valid).toEqual(['user', 'role']);
    expect(res.invalid).toEqual([]);
  });

  it('getEntityClasses returns only known classes', () => {
    const reg = EntityRegistry.getInstance();
    reg.registerEntities({ User: DummyUser, Role: DummyRole });
    const classes = getEntityClasses(['user', 'role', 'unknown']);
    expect(classes).toEqual([DummyUser, DummyRole]);
  });

  it('configureEntityRegistry merges entities and presets', () => {
    configureEntityRegistry({
      entities: { AnotherEntity: 'AnotherEntity' },
      presets: { custom: ['another_entity'] },
    });
    const reg = EntityRegistry.getInstance();
    // We only stored names to registry via registerEntities; ensure formatted key exists
    reg.registerEntity('AnotherEntity', AnotherEntity);
    expect(reg.hasEntity('another_entity')).toBe(true);
    expect(reg.getPreset('custom')).toEqual(['another_entity']);
  });

  it('getEntityRegistryConfig returns serializable names', () => {
    const reg = EntityRegistry.getInstance();
    reg.registerEntities({ User: DummyUser });
    const config = getEntityRegistryConfig();
    expect(config.entities.user).toBe('DummyUser');
    expect(Object.keys(config.presets).length).toBeGreaterThan(0);
  });

  it('getEntityRegistryDebugInfo mirrors registry state', () => {
    const reg = EntityRegistry.getInstance();
    reg.registerEntities({ Role: DummyRole });
    const debug = getEntityRegistryDebugInfo();
    expect(debug.entities).toEqual(expect.arrayContaining(['role']));
    expect(debug.entityCount).toBeGreaterThanOrEqual(1);
  });
});
