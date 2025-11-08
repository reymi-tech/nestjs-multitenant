---
sidebar_position: 4
title: Testing
description: Test your multi-tenant application
---

# Testing Multi-Tenant Applications

Comprehensive guide to testing multi-tenant NestJS applications.

## Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should find users for tenant', async () => {
    // Test implementation
  });
});
```

## Integration Testing

```typescript
describe('Multi-tenant Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should isolate data between tenants', async () => {
    // Create data for tenant A
    await request(app.getHttpServer())
      .post('/tasks')
      .set('x-tenant-id', 'tenant-a')
      .send({ title: 'Task A' });

    // Verify tenant B cannot see it
    const response = await request(app.getHttpServer())
      .get('/tasks')
      .set('x-tenant-id', 'tenant-b');

    expect(response.body).toHaveLength(0);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Next Steps

- Explore [Examples](/docs/examples/basic-setup)
- Learn about [Security](/docs/advanced/security)
