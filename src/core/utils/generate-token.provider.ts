import { EntityTarget } from 'typeorm';

export const TOKEN_CONSTANTS = {
  REPOSITORY_PREFIX: 'TENANT_REPOSITORY_',
  DATA_SOURCE: 'TENANT_DATA_SOURCE',
  FACTORY_SUFFIX: '_FACTORY',
  DRIZZLE_DB: 'TENANT_DRIZZLE_DB',
} as const;

type EntityName = {
  name?: string;
  options?: { name?: string };
};

/**
 * Generates a unique token for tenant repository injection
 * @param entity - The TypeORM entity target
 * @returns Formatted token string for DI container
 * @example getTenantRepositoryToken(User) // "TENANT_REPOSITORY_User"
 */
export function getTenantRepositoryToken(
  entity: EntityTarget<unknown>,
): string {
  const entityName =
    typeof entity === 'string'
      ? entity
      : (entity as EntityName).name ||
        (entity as EntityName).options?.name ||
        'Unknown';
  return `${TOKEN_CONSTANTS.REPOSITORY_PREFIX}${entityName}`;
}
