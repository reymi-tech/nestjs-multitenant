import { ITenantAdminController } from './tenant-admin.interface';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ITenantManagementStrategy extends ITenantAdminController {}

export const TENANT_MANAGEMENT_STRATEGY = Symbol('ITenantManagementStrategy');
