import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { TenantStatus } from '../../constants';

/**
 * PostgreSQL enum for tenant status
 */
export const tenantStatusEnum = pgEnum('tenant_status', [
  TenantStatus.ACTIVE,
  TenantStatus.INACTIVE,
  TenantStatus.SUSPENDED,
  TenantStatus.PENDING,
]);

/**
 * Tenant table schema stored in the public/admin schema
 * Contains tenant metadata and configuration
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    status: tenantStatusEnum('status').default(TenantStatus.ACTIVE).notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>(),
    entityConfig: jsonb('entity_config').$type<{
      enabledEntities: string[];
      preset?: string;
      customSettings?: Record<string, unknown>;
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  table => [
    index('idx_tenant_code').on(table.code),
    index('idx_tenant_status').on(table.status),
    index('idx_tenant_deleted_at').on(table.deletedAt),
  ],
);

/**
 * Type inference for SELECT operations
 */
export type Tenant = InferSelectModel<typeof tenants>;

/**
 * Type inference for INSERT operations
 */
export type NewTenant = InferInsertModel<typeof tenants>;

/**
 * Helper type for tenant with computed fields
 */
export type TenantWithMethods = Tenant & {
  getSchemaName(): string;
  isActive(): boolean;
  getEnabledEntities(): string[];
  isEntityEnabled(entityName: string): boolean;
  getEntitySettings(entityName: string): Record<string, unknown>;
};

/**
 * Helper functions to add methods to tenant objects
 */
export const createTenantWithMethods = (tenant: Tenant): TenantWithMethods => {
  return {
    ...tenant,
    getSchemaName(): string {
      return this.code;
    },
    isActive(): boolean {
      return this.status === TenantStatus.ACTIVE && !this.deletedAt;
    },
    getEnabledEntities(): string[] {
      return this.entityConfig?.enabledEntities || [];
    },
    isEntityEnabled(entityName: string): boolean {
      return this.getEnabledEntities().includes(entityName);
    },
    getEntitySettings(entityName: string): Record<string, unknown> {
      const settings = this.entityConfig?.customSettings?.[entityName];
      return (settings as Record<string, unknown>) || {};
    },
  };
};
