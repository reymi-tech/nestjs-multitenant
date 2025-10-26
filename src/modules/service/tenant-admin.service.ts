import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { REGEX_TENANT_NAME, TenantStatus } from 'src/constants';
import { DataSource, IsNull, Repository } from 'typeorm';

import { CreateTenantDto } from '../dto/create-tenant.dto';
import { TenantFilterDto } from '../dto/filter-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { Tenant } from '../entities/tenant.entity';
import {
  FindAllTenants,
  ITenantAdminService,
  TenantStats,
} from '../interface/core.interface';
import { IEntityConfig, ITenant } from '../interface/tenant.interface';

/**
 * Service for administrative tenant management
 *
 * This service provides methods for creating, finding, updating, and deleting tenants.
 * It also provides methods for activating and deactivating tenants.
 */
@Injectable()
export class TenantAdminService implements ITenantAdminService {
  private readonly logger = new Logger(TenantAdminService.name);

  constructor(
    @InjectRepository(Tenant, 'admin')
    private readonly tenantRepository: Repository<Tenant>,
    private readonly dataSource: DataSource,
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

    tenantDto.code = `tenant_${tenantDto.code}`;

    const existingTenant = await this.tenantRepository.findOne({
      where: { code: tenantDto.code },
    });

    if (existingTenant) {
      throw new ConflictException(
        `Tenant with code ${tenantDto.code} already exists`,
      );
    }

    // Double check schema name validity
    if (!this.isValidSchemaName(tenantDto.code)) {
      throw new ConflictException(
        `Tenant with code ${tenantDto.code} has an invalid schema name`,
      );
    }

    try {
      const entityConfig = this.processEntityConfig(tenantDto) as IEntityConfig;

      // Create tenant in database
      const tenant = this.tenantRepository.create({
        ...tenantDto,
        status: tenantDto.status || TenantStatus.ACTIVE,
        entityConfig,
      });

      const savedTenant = await this.tenantRepository.save(tenant);

      // TODO: validate config service is enable auto-creation tenant schema
      const isAutoCreateSchemasEnabled = true;
      if (isAutoCreateSchemasEnabled) {
        await this.createTenantSchema(tenantDto.code);
      }

      this.logger.log(
        `Tenant with code ${tenantDto.code} created successfully with ID: ${
          savedTenant.id
        } and entities: ${entityConfig.enabledEntities.join(',')}`,
      );
      return savedTenant;
    } catch (error) {
      this.logger.error(
        `Error creating tenant with code ${tenantDto.code}: ${error}`,
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

    const queryBuilder = this.tenantRepository
      .createQueryBuilder('tenant')
      .where('tenant.deletedAt IS NULL');

    if (search) {
      queryBuilder.andWhere(
        '(tenant.name ILIKE :search OR tenant.code ILIKE :search OR tenant.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('tenant.status = :status', { status });
    }

    queryBuilder.orderBy(`tenant.${sortBy}`, sortOrder);

    const offSet = (page - 1) * limit;
    queryBuilder.skip(offSet).take(limit);

    const [tenants, total] = await queryBuilder.getManyAndCount();

    return {
      data: tenants,
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
    const tenant = await this.tenantRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  /**
   * Finds a tenant by its code
   *
   * @param code The tenant code
   * @returns A promise that resolves to the tenant entity with the specified code, or null if no tenant is found
   */
  async findByCode(code: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { code, deletedAt: IsNull() },
    });
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
      const updateData = { ...updateTenantDto } as Partial<ITenant>;

      if (
        updateTenantDto.enableEntities ||
        updateTenantDto.entityPreset ||
        updateTenantDto.entityCustomSettings
      ) {
        const entityConfig = this.processEntityConfig(
          updateTenantDto,
          tenant.entityConfig,
        ) as IEntityConfig;

        updateData.entityConfig = entityConfig;
      }

      Object.assign(tenant, updateData);

      const updatedTenant = await this.tenantRepository.save(tenant);

      this.logger.log(`Tenant with ID ${id} updated successfully}`);
      return updatedTenant;
    } catch (error) {
      this.logger.error(`Error updating tenant with ID ${id}: ${error}`);
      throw new BadRequestException('Failed to update tenant');
    }
  }

  /**
   * Removes a tenant by its ID
   *
   * @param id The tenant ID
   * @returns A promise that resolves when the tenant is successfully removed
   */
  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    tenant.deletedAt = new Date();
    tenant.status = TenantStatus.INACTIVE;
    await this.tenantRepository.save(tenant);
    this.logger.log(`Tenant with ID ${id} removed successfully}`);
  }

  /**
   * Validates whether a tenant with the specified schema name exists
   *
   * @param schemaName The tenant schema name
   * @returns A promise that resolves to true if the tenant exists, false otherwise
   */
  async validateTenantExists(schemaName: string): Promise<boolean> {
    const tenant = await this.tenantRepository.findOne({
      where: { code: schemaName, deletedAt: IsNull() },
    });
    return !!tenant;
  }

  /**
   * Retrieves tenant statistics
   *
   * @returns A promise that resolves to tenant statistics
   */
  async getStats(): Promise<TenantStats> {
    const [total, active, inactive, suspended, pending] = await Promise.all([
      this.tenantRepository.count({
        where: { deletedAt: IsNull() },
      }),
      this.tenantRepository.count({
        where: { status: TenantStatus.ACTIVE, deletedAt: IsNull() },
      }),
      this.tenantRepository.count({
        where: { status: TenantStatus.INACTIVE, deletedAt: IsNull() },
      }),
      this.tenantRepository.count({
        where: { status: TenantStatus.SUSPENDED, deletedAt: IsNull() },
      }),
      this.tenantRepository.count({
        where: { status: TenantStatus.PENDING, deletedAt: IsNull() },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
      pending,
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

    tenant.status = TenantStatus.ACTIVE;
    tenant.deletedAt = undefined;
    const updatedTenant = await this.tenantRepository.save(tenant);
    this.logger.log(`Tenant with ID ${id} activated successfully}`);
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

    tenant.status = TenantStatus.SUSPENDED;
    tenant.deletedAt = new Date();
    const updatedTenant = await this.tenantRepository.save(tenant);
    this.logger.log(`Tenant with ID ${id} deactivated successfully}`);
    return updatedTenant;
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
    // TODO: implement entity config processing with entity registry
    console.log('Processing entity config:', dto, existingConfig);
    throw new Error('Method not implemented.');
  }

  /**
   * Creates a new database schema for the tenant
   *
   * @param schemaName The tenant schema name
   * @returns A promise that resolves when the schema is successfully created
   */
  private async createTenantSchema(schemaName: string): Promise<void> {
    try {
      await this.dataSource.query('CREATE SCHEMA IF NOT EXISTS ?', [
        schemaName,
      ]);
    } catch (error) {
      this.logger.error(`Error creating schema ${schemaName}: ${error}`);
      throw error;
    }
  }
}
