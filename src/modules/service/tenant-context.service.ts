import { Inject, Injectable, Scope } from '@nestjs/common';

import {
  IMultiTenantConfigService,
  ITenantContext,
  ITenantContextService,
} from '../../interface/tenant.interface';
import { MULTI_TENANT_CONFIG_SERVICE } from './multi-tenant-config.service';

export const TENANT_CONTEXT_SERVICE = Symbol('ITenantContextService');

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService implements ITenantContextService {
  public tenantId: string | undefined = undefined;
  public tenantSchema: string | undefined = undefined;

  constructor(
    @Inject(MULTI_TENANT_CONFIG_SERVICE)
    private readonly configService: IMultiTenantConfigService,
  ) {}

  setContext(tenantId: string): void {
    this.setTenant(tenantId);
  }

  private setTenant(tenantId: string): void {
    this.tenantId = tenantId;
    this.tenantSchema = this.calculateSchemaName(tenantId);
  }

  private calculateSchemaName(tenantId: string): string {
    const namingStrategy = this.configService.getSchemaNamingStrategy();
    return namingStrategy(tenantId);
  }

  getTenantSchema(): string | undefined {
    return this.tenantSchema;
  }

  getContext(): ITenantContext {
    return {
      tenantId: this.tenantId,
      tenantSchema: this.tenantSchema,
      hasTenant: this.tenantId !== null,
    };
  }
}
