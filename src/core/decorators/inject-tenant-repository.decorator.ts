import { Inject } from '@nestjs/common';
import { EntityTarget } from 'typeorm';

import {
  getTenantRepositoryToken,
  TOKEN_CONSTANTS,
} from '../utils/generate-token.provider';

/**
 * Inject the tenant repository for the specified entity (TypeORM only).
 * This decorator should only be used when the module is configured with TypeORM.
 *
 * @param entity The entity target.
 * @returns The parameter decorator.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectTenantRepository(User)
 *     private readonly userRepository: Repository<User>,
 *   ) {}
 * }
 * ```
 */
export function InjectTenantRepository<T>(
  entity: EntityTarget<T>,
): ParameterDecorator {
  return Inject(getTenantRepositoryToken(entity));
}

/**
 * Inject the tenant data source (TypeORM only).
 * This decorator should only be used when the module is configured with TypeORM.
 *
 * @returns The parameter decorator.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectTenantDataSource()
 *     private readonly dataSource: DataSource,
 *   ) {}
 * }
 * ```
 */
export function InjectTenantDataSource(): ParameterDecorator {
  return Inject(TOKEN_CONSTANTS.DATA_SOURCE);
}

/**
 * Inject the tenant repository factory for the specified entity (TypeORM only).
 * This decorator should only be used when the module is configured with TypeORM.
 *
 * @param entity The entity target.
 * @returns The parameter decorator.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectTenantRepositoryFactory(User)
 *     private readonly userRepositoryFactory: (tenantId: string) => Promise<Repository<User>>,
 *   ) {}
 *
 *   async getUsersForTenant(tenantId: string) {
 *     const userRepo = await this.userRepositoryFactory(tenantId);
 *     return userRepo.find();
 *   }
 * }
 * ```
 */
export function InjectTenantRepositoryFactory<T>(
  entity: EntityTarget<T>,
): ParameterDecorator {
  return Inject(`${getTenantRepositoryToken(entity)}_FACTORY`);
}
