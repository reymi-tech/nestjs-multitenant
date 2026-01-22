import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  FindAllTenants,
  ITenantAdminController,
  ITenantAdminService,
  TENANT_ADMIN_SERVICE,
  TenantStats,
} from '../../interface/core.interface';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { TenantFilterDto } from '../dto/filter-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { Tenant } from '../entities/tenant.entity';

/**
 * Tenant Admin Controller
 * @description Controller for tenant admin operations
 */
@Controller('admin/tenant')
export class TenantAdminController implements ITenantAdminController {
  constructor(
    @Inject(TENANT_ADMIN_SERVICE)
    private readonly tenantAdminService: ITenantAdminService,
  ) {}

  /**
   * Create a new tenant
   * @param createTenantDto Tenant data to create
   */
  @Post()
  create(@Body() createTenantDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantAdminService.create(createTenantDto);
  }

  /**
   * Get all tenants
   * @param filterDto Filter data to apply
   */
  @Get()
  findAll(@Query() filterDto: TenantFilterDto): Promise<FindAllTenants> {
    return this.tenantAdminService.findAll(filterDto);
  }

  /**
   * Get a tenant by id
   * @param id Tenant id to get
   */
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Tenant> {
    return this.tenantAdminService.findOne(id);
  }

  /**
   * Update a tenant
   * @param id Tenant id to update
   * @param updateTenantDto Tenant data to update
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<Tenant> {
    return this.tenantAdminService.update(id, updateTenantDto);
  }

  /**
   * Soft delete a tenant
   * @param id Tenant id to remove
   */
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.tenantAdminService.remove(id);
  }

  @Get('stats/overview')
  getStats(): Promise<TenantStats> {
    return this.tenantAdminService.getStats();
  }

  /**
   * Activate a tenant
   * @param id Tenant id to activate
   */
  @Patch(':id/activate')
  activate(@Param('id') id: string): Promise<Tenant> {
    return this.tenantAdminService.activate(id);
  }

  /**
   * Deactivate a tenant
   * @param id Tenant id to deactivate
   */
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string): Promise<Tenant> {
    return this.tenantAdminService.deactivate(id);
  }

  /**
   * Find a tenant by code
   * @param code Tenant code
   */
  @Get('code/:code')
  findByCode(@Param('code') code: string): Promise<Tenant> {
    return this.tenantAdminService.findByCode(code);
  }

  /**
   * Validate if a tenant exists
   * @param code Tenant code
   */
  @Get('validate/:code')
  validate(@Param('code') code: string): Promise<{ exists: boolean }> {
    return this.tenantAdminService.validate(code);
  }
}
