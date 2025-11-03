import { CreateTenantDto } from '../modules/dto/create-tenant.dto';
import { TenantFilterDto } from '../modules/dto/filter-tenant.dto';
import { UpdateTenantDto } from '../modules/dto/update-tenant.dto';
import { Tenant } from '../modules/entities/tenant.entity';

export interface FindAllTenants {
  data: Tenant[];
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
  create(tenantDto: CreateTenantDto): Promise<Tenant>;

  findAll(filterDto: TenantFilterDto): Promise<FindAllTenants>;

  findOne(id: string): Promise<Tenant>;

  update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant>;

  remove(id: string): Promise<void>;

  getStats(): Promise<TenantStats>;

  activate(id: string): Promise<Tenant>;

  deactivate(id: string): Promise<Tenant>;
}

export interface ITenantAdminService extends ITenantAdminController {
  findByCode(code: string): Promise<Tenant | null>;
  validateTenantExists(schemaName: string): Promise<boolean>;
}

// Strongly-typed injection token to ensure consumers depend on the interface only
export const TENANT_ADMIN_SERVICE = Symbol('ITenantAdminService');
