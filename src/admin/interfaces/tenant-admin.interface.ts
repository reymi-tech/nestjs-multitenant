import { CreateTenantDto } from '../dto/create-tenant.dto';
import { TenantFilterDto } from '../dto/filter-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { Tenant } from '../entities/tenant.entity';
import { Tenant as TenantSchema } from '../schema/tenant.schema';

export interface FindAllTenants {
  data: Tenant[] | TenantSchema[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TenantStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
}

export interface ITenantAdminController {
  create(tenantDto: CreateTenantDto): Promise<Tenant | TenantSchema>;

  findAll(filterDto: TenantFilterDto): Promise<FindAllTenants>;

  findOne(id: string): Promise<Tenant | TenantSchema>;

  update(
    id: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<Tenant | TenantSchema>;

  remove(id: string): Promise<void>;

  getStats(): Promise<TenantStats>;

  activate(id: string): Promise<Tenant | TenantSchema>;

  deactivate(id: string): Promise<Tenant | TenantSchema>;

  findByCode(code: string): Promise<Tenant | TenantSchema>;

  validate(code: string): Promise<{ exists: boolean }>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ITenantAdminService extends ITenantAdminController {}

// Strongly-typed injection token to ensure consumers depend on the interface only
export const TENANT_ADMIN_SERVICE = Symbol('ITenantAdminService');
