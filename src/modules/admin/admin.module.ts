import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Tenant } from '../entities/tenant.entity';
import { TENANT_ADMIN_SERVICE } from '../interface/core.interface';
import {
  MULTI_TENANT_CONFIG_SERVICE,
  MultiTenantConfigService,
} from '../service/multi-tenant-config.service';
import { TenantAdminService } from '../service/tenant-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant], 'admin')],
  providers: [
    {
      provide: TENANT_ADMIN_SERVICE,
      useClass: TenantAdminService,
    },
    {
      provide: MULTI_TENANT_CONFIG_SERVICE,
      useClass: MultiTenantConfigService,
    },
  ],
  exports: [TENANT_ADMIN_SERVICE, TypeOrmModule],
})
export class AdminModule {}
