import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createDatabaseConfigFromEnv,
  getAdminDatabaseConfig,
  getMultiTenantDatabaseConfig,
} from '../../../src/config/database.config';
import { createMock, Mock } from '../../utils/mock';

describe('database.config', () => {
  let mockConfigService: Mock<ConfigService>;

  beforeEach(() => {
    mockConfigService = createMock<ConfigService>();
  });

  it('getAdminDatabaseConfig returns config with admin entities', () => {
    const cfg = getAdminDatabaseConfig(mockConfigService, {
      database: 'test_db',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'pass',
      synchronize: false,
      logging: false,
    });
    expect(cfg.entities?.length).toBeGreaterThan(0);
    expect(cfg.type).toBe('postgres');
    expect(cfg.database).toBe('test_db');
    expect((cfg as any).schema).toBe('public');
  });

  it('getMultiTenantDatabaseConfig builds config with schema and entities', () => {
    const cfg = getMultiTenantDatabaseConfig(
      mockConfigService,
      'tenant_abc',
      undefined,
      {
        database: 'db',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'pass',
        synchronize: false,
        logging: false,
      },
    );
    expect((cfg as any).schema).toBe('tenant_abc');
    expect(cfg.entities?.length).toBeGreaterThan(0);
  });

  it('createDatabaseConfigFromEnv maps env vars correctly', () => {
    mockConfigService.get.mockImplementation((key: string, def?: any) => {
      const map: Record<string, any> = {
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USERNAME: 'user',
        DB_PASSWORD: 'pass',
        DB_DATABASE: 'name',
        DB_SYNCHRONIZE: true,
        DB_LOGGING: false,
        DB_SSL: true,
      };
      return key in map ? map[key] : def;
    });
    const cfg = createDatabaseConfigFromEnv(mockConfigService);
    expect(cfg.host).toBe('localhost');
    expect(cfg.port).toBe(5432);
    expect(cfg.username).toBe('user');
    expect(cfg.password).toBe('pass');
    expect(cfg.database).toBe('name');
    expect(cfg.ssl).toBe(true);
  });
});
