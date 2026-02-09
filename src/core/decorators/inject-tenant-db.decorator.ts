import { Inject } from '@nestjs/common';

import { TOKEN_CONSTANTS } from '../utils/generate-token.provider';

/**
 * Inject the tenant Drizzle database instance (Drizzle only).
 * This decorator should only be used when the module is configured with Drizzle ORM.
 *
 * @returns The parameter decorator.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectTenantDb()
 *     private readonly db: NodePgDatabase,
 *   ) {}
 * }
 * ```
 */
export function InjectTenantDb(): ParameterDecorator {
  return Inject(TOKEN_CONSTANTS.DRIZZLE_DB);
}

/**
 * Inject the tenant Drizzle database factory (Drizzle only).
 * This decorator should only be used when the module is configured with Drizzle ORM.
 *
 * @returns The parameter decorator.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectTenantDbFactory()
 *     private readonly dbFactory: (tenantId: string) => Promise<NodePgDatabase>,
 *   ) {}
 *
 *   async getUsersForTenant(tenantId: string) {
 *     const db = await this.dbFactory(tenantId);
 *     return db.select().from(users);
 *   }
 * }
 * ```
 */
export function InjectTenantDbFactory(): ParameterDecorator {
  return Inject(`${TOKEN_CONSTANTS.DRIZZLE_DB}_FACTORY`);
}
