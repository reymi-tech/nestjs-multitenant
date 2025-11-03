import { Inject } from '@nestjs/common';
import { EntityTarget } from 'typeorm';

import {
  getTenantRepositoryToken,
  TENANT_DATA_SOURCE_TOKEN,
} from '../providers/tenant-repository.provider';

/**
 * Inject the tenant repository for the specified entity.
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
 * Inject the tenant data source.
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
  return Inject(TENANT_DATA_SOURCE_TOKEN);
}

/**
 * Inject the tenant repository factory for the specified entity.
 * @param entity The entity target.
 * @returns The parameter decorator.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectTenantRepositoryFactory(User)
 *     private readonly userRepositoryFactory: RepositoryFactory<User>,
 *   ) {}
 * }
 * ```
 */
export function InjectTenantRepositoryFactory<T>(
  entity: EntityTarget<T>,
): ParameterDecorator {
  return Inject(`${getTenantRepositoryToken(entity)}_FACTORY`);
}
