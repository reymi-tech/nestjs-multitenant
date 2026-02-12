import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import {
  FindAllTenants,
  ITenantAdminService,
  TenantStats,
} from '../../admin/interfaces/tenant-admin.interface';
import { EntityRegistry } from '../../config/entity.registry';
import { EntityName, REGEX_TENANT_NAME, TenantStatus } from '../../constants';
import {
  TenantConflictError,
  TenantValidationError,
} from '../../core/exceptions/custom-errors';
import {
  IEntityConfig,
  IMultiTenantConfigService,
} from '../../core/interfaces/tenant.interface';
import { MULTI_TENANT_CONFIG_SERVICE } from '../../core/services/multi-tenant-config.service';
import { validateEntityNames } from '../../core/utils/entity-registry.utils';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { TenantFilterDto } from '../dto/filter-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { type NewTenant, type Tenant, tenants } from '../schema/tenant.schema';

/**
 * Token for injecting the admin database
 */
export const ADMIN_DATABASE = Symbol('ADMIN_DATABASE');

/**
 * Service for administrative tenant management using Drizzle ORM
 *
 * This service provides methods for creating, finding, updating, and deleting tenants
 * using Drizzle ORM instead of TypeORM.
 */
@Injectable()
export class DrizzleTenantAdminService implements ITenantAdminService {
  private readonly logger = new Logger(DrizzleTenantAdminService.name);

  constructor(
    @Inject(ADMIN_DATABASE)
    private readonly db: NodePgDatabase,

    @Optional()
    @Inject(MULTI_TENANT_CONFIG_SERVICE)
    private readonly configService?: IMultiTenantConfigService,
  ) {}

  /**
   * Creates a new tenant
   *
   * @param tenantDto The tenant creation DTO
   * @returns The created tenant entity
   */
  async create(tenantDto: CreateTenantDto): Promise<Tenant> {
    this.logger.log(
      `Creating tenant with code: ${tenantDto.code}, name: ${tenantDto.name}`,
    );

    const tenantCode = `tenant_${tenantDto.code}`;

    // Check if tenant already exists
    const [existingTenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.code, tenantCode))
      .limit(1);

    if (existingTenant) {
      throw new TenantConflictError(
        `Tenant with code ${tenantCode} already exists`,
      );
    }

    // Validate schema name
    if (!this.isValidSchemaName(tenantCode)) {
      throw new TenantValidationError(
        ['Invalid schema name'],
        `Tenant with code ${tenantCode} has an invalid schema name`,
      );
    }

    try {
      const entityConfig = this.processEntityConfig(tenantDto);

      // Create tenant in database
      const newTenant: NewTenant = {
        code: tenantCode,
        name: tenantDto.name,
        description: tenantDto.description,
        status: tenantDto.status || TenantStatus.ACTIVE,
        settings: tenantDto.settings,
        entityConfig: entityConfig,
      };

      const [createdTenant] = await this.db
        .insert(tenants)
        .values(newTenant)
        .returning();

      // Auto-create schema if enabled
      if (this.configService?.isAutoCreateSchemasEnabled()) {
        await this.createTenantSchema(tenantCode);
      }

      this.logger.log(
        `Tenant with code ${tenantCode} created successfully with ID: ${
          createdTenant.id
        } and entities: ${entityConfig.enabledEntities.join(',')}`,
      );

      return createdTenant;
    } catch (error) {
      this.logger.error(
        `Error creating tenant with code ${tenantCode}: ${error}`,
      );
      throw new BadRequestException('Failed to create tenant');
    }
  }

  /**
   * Finds all tenants based on the provided filter criteria
   *
   * @param filterDto The tenant filter DTO
   * @returns A promise that resolves to an array of tenant entities that match the filter criteria
   */
  async findAll(filterDto: TenantFilterDto): Promise<FindAllTenants> {
    const {
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
    } = filterDto;

    // Build where conditions
    const conditions = [isNull(tenants.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(tenants.name, `%${search}%`),
          ilike(tenants.code, `%${search}%`),
          ilike(tenants.description, `%${search}%`),
        )!,
      );
    }

    if (status) {
      conditions.push(eq(tenants.status, status));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(tenants)
      .where(whereClause);

    // Map sortBy to actual column - FIX: Explicit column mapping
    const sortColumnMap = {
      name: tenants.name,
      code: tenants.code,
      status: tenants.status,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
    };

    // Get paginated results
    const offset = (page - 1) * limit;
    const sortColumn =
      sortColumnMap[sortBy as keyof typeof sortColumnMap] || tenants.createdAt;
    const orderByClause = sortOrder === 'DESC' ? desc(sortColumn) : sortColumn;

    const data = await this.db
      .select()
      .from(tenants)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Finds a tenant by its ID
   *
   * @param id The tenant ID
   * @returns A promise that resolves to the tenant entity with the specified ID
   */
  async findOne(id: string): Promise<Tenant> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  /**
   * Updates a tenant by its ID
   *
   * @param id The tenant ID
   * @param updateTenantDto The tenant update DTO
   * @returns A promise that resolves to the updated tenant entity
   */
  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    try {
      const updateData: Partial<NewTenant> = {
        name: updateTenantDto.name,
        description: updateTenantDto.description,
        status: updateTenantDto.status,
        settings: updateTenantDto.settings,
        updatedAt: new Date(),
      };

      // Process entity config if provided
      if (
        updateTenantDto.enabledEntities ||
        updateTenantDto.entityPreset ||
        updateTenantDto.entityCustomSettings
      ) {
        const entityConfig = this.processEntityConfig(
          updateTenantDto,
          tenant.entityConfig as IEntityConfig,
        );
        updateData.entityConfig = entityConfig;
      }

      const [updatedTenant] = await this.db
        .update(tenants)
        .set(updateData)
        .where(eq(tenants.id, id))
        .returning();

      this.logger.log(`Tenant with ID ${id} updated successfully`);
      return updatedTenant;
    } catch (error) {
      this.logger.error(`Error updating tenant with ID ${id}: ${error}`);
      throw new BadRequestException('Failed to update tenant');
    }
  }

  /**
   * Removes a tenant by its ID (soft delete)
   *
   * @param id The tenant ID
   * @returns A promise that resolves when the tenant is successfully removed
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id); // Verify tenant exists

    await this.db
      .update(tenants)
      .set({
        deletedAt: new Date(),
        status: TenantStatus.INACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id));

    this.logger.log(`Tenant with ID ${id} removed successfully`);
  }

  /**
   * Retrieves tenant statistics
   *
   * @returns A promise that resolves to tenant statistics
   */
  async getStats(): Promise<TenantStats> {
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(tenants)
      .where(isNull(tenants.deletedAt));

    const [activeResult] = await this.db
      .select({ count: count() })
      .from(tenants)
      .where(
        and(eq(tenants.status, TenantStatus.ACTIVE), isNull(tenants.deletedAt)),
      );

    const [inactiveResult] = await this.db
      .select({ count: count() })
      .from(tenants)
      .where(
        and(
          eq(tenants.status, TenantStatus.INACTIVE),
          isNull(tenants.deletedAt),
        ),
      );

    const [suspendedResult] = await this.db
      .select({ count: count() })
      .from(tenants)
      .where(
        and(
          eq(tenants.status, TenantStatus.SUSPENDED),
          isNull(tenants.deletedAt),
        ),
      );

    const [pendingResult] = await this.db
      .select({ count: count() })
      .from(tenants)
      .where(
        and(
          eq(tenants.status, TenantStatus.PENDING),
          isNull(tenants.deletedAt),
        ),
      );

    return {
      total: totalResult.count,
      active: activeResult.count,
      inactive: inactiveResult.count,
      suspended: suspendedResult.count,
      pending: pendingResult.count,
    };
  }

  /**
   * Activates a tenant by its ID
   *
   * @param id The tenant ID
   * @returns A promise that resolves to the activated tenant entity
   */
  async activate(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (tenant.status === TenantStatus.ACTIVE) {
      throw new BadRequestException('Tenant is already active');
    }

    const [updatedTenant] = await this.db
      .update(tenants)
      .set({
        status: TenantStatus.ACTIVE,
        deletedAt: undefined,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    this.logger.log(`Tenant with ID ${id} activated successfully`);
    return updatedTenant;
  }

  /**
   * Deactivates a tenant by its ID
   *
   * @param id The tenant ID
   * @returns A promise that resolves to the deactivated tenant entity
   */
  async deactivate(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (tenant.status === TenantStatus.INACTIVE) {
      throw new BadRequestException('Tenant is already inactive');
    }

    const [updatedTenant] = await this.db
      .update(tenants)
      .set({
        status: TenantStatus.SUSPENDED,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    this.logger.log(`Tenant with ID ${id} deactivated successfully`);
    return updatedTenant;
  }

  /**
   * Finds a tenant by its code
   *
   * @param code The tenant code
   * @returns A promise that resolves to the tenant entity with the specified code
   */
  async findByCode(code: string): Promise<Tenant> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.code, code), isNull(tenants.deletedAt)))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException(`Tenant with code ${code} not found`);
    }

    return tenant;
  }

  /**
   * Validates if a tenant exists by code
   *
   * @param code The tenant code
   * @returns A promise that resolves to an object indicating if the tenant exists
   */
  async validate(code: string): Promise<{ exists: boolean }> {
    const [result] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.code, code), isNull(tenants.deletedAt)))
      .limit(1);

    return { exists: !!result };
  }

  /**
   * Validates whether a schema name is valid for a tenant
   *
   * @param name The schema name to validate
   * @returns True if the schema name is valid, false otherwise
   */
  private isValidSchemaName(name: string): boolean {
    return REGEX_TENANT_NAME.test(name);
  }

  /**
   * Processes entity configuration for tenant creation or update
   *
   * @param dto The tenant creation or update DTO
   * @param existingConfig The existing entity configuration (optional)
   * @returns The processed entity configuration
   */
  private processEntityConfig(
    dto: CreateTenantDto | UpdateTenantDto,
    existingConfig?: IEntityConfig,
  ): IEntityConfig {
    const registry = EntityRegistry.getInstance();
    let enabledEntities: EntityName[] = existingConfig?.enabledEntities || [];
    let customSettings: Record<string, unknown> =
      existingConfig?.customSettings || {};
    let preset: string | undefined = existingConfig?.preset;

    // Process entity preset if provided
    if (dto.entityPreset) {
      preset = dto.entityPreset;
      const presetEntities = registry.getPreset(dto.entityPreset);
      if (presetEntities.length > 0) {
        enabledEntities = presetEntities;
      }
    }

    // Process individual entity enablement if provided
    if (dto.enabledEntities && dto.enabledEntities.length > 0) {
      const validation = validateEntityNames(dto.enabledEntities);
      enabledEntities = validation.valid;

      if (validation.invalid.length > 0) {
        throw new BadRequestException(
          `Invalid entities ignored: ${validation.invalid.join(', ')}`,
        );
      }
    }

    if (dto.entityCustomSettings) {
      customSettings = { ...customSettings, ...dto.entityCustomSettings };
    }

    if (enabledEntities.length === 0) {
      enabledEntities = registry.getPreset('basic');
      preset = 'basic';
    }

    return {
      enabledEntities,
      customSettings,
      preset,
    };
  }

  /**
   * Creates a new database schema for the tenant
   *
   * @param schemaName The tenant schema name
   * @returns A promise that resolves when the schema is successfully created
   */
  private async createTenantSchema(schemaName: string): Promise<void> {
    try {
      await this.db.execute(
        sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`),
      );
      this.logger.log(`Schema ${schemaName} created successfully`);
    } catch (error) {
      this.logger.error(`Error creating schema ${schemaName}: ${error}`);
      throw error;
    }
  }
}
