import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  MULTI_TENANT_CONFIG_SERVICE,
  MultiTenantConfigService,
} from '../core/services/multi-tenant-config.service';
import { Tenant } from './entities/tenant.entity';
import { TENANT_ADMIN_SERVICE } from './interfaces/tenant-admin.interface';
import { TenantAdminService } from './services/tenant-admin.service';

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
