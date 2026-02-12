import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateTenantDto } from '../../../../src/admin/dto/create-tenant.dto';
import { TenantFilterDto } from '../../../../src/admin/dto/filter-tenant.dto';
import { UpdateTenantDto } from '../../../../src/admin/dto/update-tenant.dto';
import { Tenant } from '../../../../src/admin/entities/tenant.entity';
import {
  FindAllTenants,
  TenantStats,
} from '../../../../src/admin/interfaces/tenant-admin.interface';
import { TenantAdminService } from '../../../../src/admin/services/tenant-admin.service';
import { EntityRegistry } from '../../../../src/config/entity.registry';
import { EntityName, TenantStatus } from '../../../../src/constants';
import {
  TenantConflictError,
  TenantValidationError,
} from '../../../../src/core/exceptions/custom-errors';
import { IMultiTenantConfigService } from '../../../../src/core/interfaces/tenant.interface';
import { LocalTenantValidationStrategy } from '../../../../src/core/strategies/validation/local-tenant-validation.strategy';
import { createMock, Mock } from '../../../utils/mock';

// Factory functions para crear datos de prueba
const createMockTenant = (overrides?: Partial<Tenant>): Tenant => {
  const tenant = new Tenant();
  tenant.id = '123e4567-e89b-12d3-a456-426614174000';
  tenant.code = 'tenant_test';
  tenant.name = 'Test Tenant';
  tenant.description = 'Test tenant description';
  tenant.status = TenantStatus.ACTIVE;
  tenant.entityConfig = {
    enabledEntities: ['user', 'role'] as EntityName[],
    customSettings: {},
    preset: 'basic',
  };
  tenant.createdAt = new Date('2024-01-01T00:00:00Z');
  tenant.updatedAt = new Date('2024-01-01T00:00:00Z');
  tenant.deletedAt = undefined;
  return Object.assign(tenant, overrides);
};

const createMockCreateTenantDto = (
  overrides?: Partial<CreateTenantDto>,
): CreateTenantDto => {
  const dto = new CreateTenantDto();
  dto.code = 'test';
  dto.name = 'Test Tenant';
  dto.description = 'Test tenant description';
  dto.status = TenantStatus.ACTIVE;
  dto.enabledEntities = ['user', 'role'] as EntityName[];
  dto.entityPreset = 'basic';
  dto.entityCustomSettings = {};
  return Object.assign(dto, overrides);
};

const createMockUpdateTenantDto = (
  overrides?: Partial<UpdateTenantDto>,
): UpdateTenantDto => {
  const dto = new UpdateTenantDto();
  dto.name = 'Updated Test Tenant';
  dto.description = 'Updated description';
  dto.status = TenantStatus.ACTIVE;
  return Object.assign(dto, overrides);
};

const createMockTenantFilterDto = (
  overrides?: Partial<TenantFilterDto>,
): TenantFilterDto => {
  const dto = new TenantFilterDto();
  dto.search = '';
  dto.status = undefined;
  dto.sortBy = 'createdAt';
  dto.sortOrder = 'DESC';
  dto.page = 1;
  dto.limit = 10;
  return Object.assign(dto, overrides);
};

describe('TenantAdminService', () => {
  let service: TenantAdminService;
  let tenantRepository: Mock<Repository<Tenant>>;
  let dataSource: Mock<DataSource>;
  let configService: Mock<IMultiTenantConfigService>;
  let entityRegistry: Mock<EntityRegistry>;
  // let tenantValidationStrategy: Mock<ITenantValidationStrategy>;
  let tenantValidationStrategy: LocalTenantValidationStrategy;

  beforeEach(() => {
    // Crear mocks
    tenantRepository = createMock<Repository<Tenant>>();
    dataSource = createMock<DataSource>();
    configService = createMock<IMultiTenantConfigService>();
    entityRegistry = createMock<EntityRegistry>();

    // Mock de EntityRegistry singleton
    vi.spyOn(EntityRegistry, 'getInstance').mockReturnValue(entityRegistry);
    // Configurar EntityRegistry mock para devolver entidades válidas
    entityRegistry.hasEntity.mockImplementation((entityName: string) => {
      return ['user', 'role', 'product', 'order'].includes(entityName);
    });
    entityRegistry.getPreset.mockReturnValue(['user', 'role'] as EntityName[]);

    // Crear instancia del servicio directamente
    service = new TenantAdminService(
      tenantRepository,
      dataSource,
      configService,
    );

    tenantValidationStrategy = new LocalTenantValidationStrategy(
      tenantRepository,
    );

    // Configurar mocks por defecto
    configService.isAutoCreateSchemasEnabled.mockReturnValue(false);
  });

  describe('create', () => {
    it('should create a tenant successfully', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto();
      const expectedTenant = createMockTenant();

      tenantRepository.findOne.mockResolvedValue(undefined as any);
      tenantRepository.create.mockReturnValue(expectedTenant);
      tenantRepository.save.mockResolvedValue(expectedTenant);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(expectedTenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'tenant_test' },
      });
      expect(tenantRepository.create).toHaveBeenCalledWith({
        ...createDto,
        code: 'tenant_test',
        status: TenantStatus.ACTIVE,
        entityConfig: {
          enabledEntities: ['user', 'role'],
          customSettings: {},
          preset: 'basic',
        },
      });
      expect(tenantRepository.save).toHaveBeenCalledWith(expectedTenant);
    });

    it('should throw ConflictException when tenant code already exists', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto();
      const existingTenant = createMockTenant();

      tenantRepository.findOne.mockResolvedValue(existingTenant);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        TenantConflictError,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Tenant with code tenant_tenant_test already exists',
      );
    });

    it('should throw ConflictException for invalid schema name', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto({ code: 'INVALID-CODE!' });

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        TenantValidationError,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Tenant with code tenant_tenant_INVALID-CODE! has an invalid schema name',
      );
    });

    it('should create tenant schema when auto-create is enabled', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto();
      const expectedTenant = createMockTenant();

      tenantRepository.findOne.mockResolvedValue(undefined as any);
      tenantRepository.create.mockReturnValue(expectedTenant);
      tenantRepository.save.mockResolvedValue(expectedTenant);
      configService.isAutoCreateSchemasEnabled.mockReturnValue(true);
      dataSource.query.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(expectedTenant);
      expect(dataSource.query).toHaveBeenCalledWith(
        'CREATE SCHEMA IF NOT EXISTS "tenant_test"',
      );
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto();

      tenantRepository.findOne.mockResolvedValue(undefined as any);
      tenantRepository.create.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Failed to create tenant',
      );
    });

    it('should use default entity preset when no entities specified', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto({
        enabledEntities: undefined,
        entityPreset: undefined,
      });
      const expectedTenant = createMockTenant();

      tenantRepository.findOne.mockResolvedValue(undefined as any);
      tenantRepository.create.mockReturnValue(expectedTenant);
      tenantRepository.save.mockResolvedValue(expectedTenant);

      // Act
      await service.create(createDto);

      // Assert
      expect(entityRegistry.getPreset).toHaveBeenCalledWith('basic');
      expect(tenantRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityConfig: expect.objectContaining({
            preset: 'basic',
            enabledEntities: ['user', 'role'],
          }),
        }),
      );
    });

    it('should validate and filter invalid entity names', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto({
        enabledEntities: ['user', 'invalid_entity', 'role'] as EntityName[],
      });

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Failed to create tenant',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated tenants with default filters', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto();
      const tenants = [createMockTenant(), createMockTenant({ id: '2' })];
      const total = 2;

      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([tenants, total]),
      };

      tenantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const expectedResult: FindAllTenants = {
        data: tenants,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      // Act
      const result = await service.findAll(filterDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'tenant.deletedAt IS NULL',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tenant.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply search filter when provided', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({ search: 'test' });

      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      tenantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(tenant.name ILIKE :search OR tenant.code ILIKE :search OR tenant.description ILIKE :search)',
        { search: '%test%' },
      );
    });

    it('should apply status filter when provided', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({
        status: TenantStatus.ACTIVE,
      });

      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      tenantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tenant.status = :status',
        { status: TenantStatus.ACTIVE },
      );
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({ page: 3, limit: 5 });

      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 23]),
      };

      tenantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      const result = await service.findAll(filterDto);

      // Assert
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.meta.totalPages).toBe(5); // Math.ceil(23/5)
    });

    it('should apply custom sorting', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({
        sortBy: 'name',
        sortOrder: 'ASC',
      });

      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      tenantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tenant.name',
        'ASC',
      );
    });
  });

  describe('findOne', () => {
    it('should return tenant when found', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedTenant = createMockTenant({ id: tenantId });

      tenantRepository.findOne.mockResolvedValue(expectedTenant);

      // Act
      const result = await service.findOne(tenantId);

      // Assert
      expect(result).toEqual(expectedTenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { id: tenantId, deletedAt: IsNull() },
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      const tenantId = 'non-existent-id';

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act & Assert
      await expect(service.findOne(tenantId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(tenantId)).rejects.toThrow(
        `Tenant with ID ${tenantId} not found`,
      );
    });
  });

  describe('findByCode', () => {
    it('should return tenant when found by code', async () => {
      // Arrange
      const tenantCode = 'tenant_test';
      const expectedTenant = createMockTenant({ code: tenantCode });

      tenantRepository.findOne.mockResolvedValue(expectedTenant);

      // Act
      const result = await tenantValidationStrategy.findByCode(tenantCode);

      // Assert
      expect(result).toEqual(expectedTenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { code: tenantCode, deletedAt: IsNull() },
      });
    });

    it('should return null when tenant not found by code', async () => {
      // Arrange
      const tenantCode = 'non-existent-code';

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act
      const result = await tenantValidationStrategy.findByCode(tenantCode);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update tenant successfully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto = createMockUpdateTenantDto();
      const existingTenant = createMockTenant({ id: tenantId });
      const updatedTenant = createMockTenant({
        id: tenantId,
        name: updateDto.name,
        description: updateDto.description,
      });

      tenantRepository.findOne.mockResolvedValue(existingTenant);
      tenantRepository.save.mockResolvedValue(updatedTenant);

      // Act
      const result = await service.update(tenantId, updateDto);

      // Assert
      expect(result).toEqual(updatedTenant);
      expect(tenantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tenantId,
          name: updateDto.name,
          description: updateDto.description,
        }),
      );
    });

    it('should throw NotFoundException when tenant not found for update', async () => {
      // Arrange
      const tenantId = 'non-existent-id';
      const updateDto = createMockUpdateTenantDto();

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act & Assert
      await expect(service.update(tenantId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update entity configuration when provided', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto = createMockUpdateTenantDto({
        enabledEntities: ['user'] as EntityName[],
        entityPreset: 'userOnly',
      });
      const existingTenant = createMockTenant({ id: tenantId });

      tenantRepository.findOne.mockResolvedValue(existingTenant);
      tenantRepository.save.mockResolvedValue(existingTenant);
      entityRegistry.getPreset.mockReturnValue(['user'] as EntityName[]);

      // Act
      await service.update(tenantId, updateDto);

      // Assert
      expect(tenantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          entityConfig: expect.objectContaining({
            enabledEntities: ['user'],
            preset: 'userOnly',
          }),
        }),
      );
    });

    it('should handle update errors gracefully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto = createMockUpdateTenantDto();
      const existingTenant = createMockTenant({ id: tenantId });

      tenantRepository.findOne.mockResolvedValue(existingTenant);
      tenantRepository.save.mockRejectedValue(
        new Error('Database update failed'),
      );

      // Act & Assert
      await expect(service.update(tenantId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(tenantId, updateDto)).rejects.toThrow(
        'Failed to update tenant',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete tenant successfully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const existingTenant = createMockTenant({ id: tenantId });

      tenantRepository.findOne.mockResolvedValue(existingTenant);
      tenantRepository.save.mockResolvedValue(existingTenant);

      // Act
      await service.remove(tenantId);

      // Assert
      expect(tenantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tenantId,
          status: TenantStatus.INACTIVE,
          deletedAt: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException when tenant not found for removal', async () => {
      // Arrange
      const tenantId = 'non-existent-id';

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act & Assert
      await expect(service.remove(tenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateTenantExists', () => {
    it('should return true when tenant exists', async () => {
      // Arrange
      const schemaName = 'tenant_test';
      const existingTenant = createMockTenant({ code: schemaName });

      tenantRepository.findOne.mockResolvedValue(existingTenant);

      // Act
      const result =
        await tenantValidationStrategy.validateTenantExists(schemaName);

      // Assert
      expect(result).toBe(true);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { code: schemaName, deletedAt: IsNull() },
      });
    });

    it('should return false when tenant does not exist', async () => {
      // Arrange
      const schemaName = 'non-existent-tenant';

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act
      const result =
        await tenantValidationStrategy.validateTenantExists(schemaName);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return tenant statistics', async () => {
      // Arrange
      const expectedStats: TenantStats = {
        total: 100,
        active: 80,
        inactive: 10,
        suspended: 5,
        pending: 5,
      };

      tenantRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(10) // inactive
        .mockResolvedValueOnce(5) // suspended
        .mockResolvedValueOnce(5); // pending

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual(expectedStats);
      expect(tenantRepository.count).toHaveBeenCalledTimes(5);
    });

    it('should handle zero counts correctly', async () => {
      // Arrange
      tenantRepository.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // active
        .mockResolvedValueOnce(0) // inactive
        .mockResolvedValueOnce(0) // suspended
        .mockResolvedValueOnce(0); // pending

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
        pending: 0,
      });
    });
  });

  describe('activate', () => {
    it('should activate inactive tenant successfully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const inactiveTenant = createMockTenant({
        id: tenantId,
        status: TenantStatus.INACTIVE,
        deletedAt: new Date(),
      });
      const activatedTenant = createMockTenant({
        id: tenantId,
        status: TenantStatus.ACTIVE,
        deletedAt: undefined,
      });

      tenantRepository.findOne.mockResolvedValue(inactiveTenant);
      tenantRepository.save.mockResolvedValue(activatedTenant);

      // Act
      const result = await service.activate(tenantId);

      // Assert
      expect(result).toEqual(activatedTenant);
      expect(tenantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tenantId,
          status: TenantStatus.ACTIVE,
          deletedAt: undefined,
        }),
      );
    });

    it('should throw BadRequestException when tenant is already active', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const activeTenant = createMockTenant({
        id: tenantId,
        status: TenantStatus.ACTIVE,
      });

      tenantRepository.findOne.mockResolvedValue(activeTenant);

      // Act & Assert
      await expect(service.activate(tenantId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.activate(tenantId)).rejects.toThrow(
        'Tenant is already active',
      );
    });

    it('should throw NotFoundException when tenant not found for activation', async () => {
      // Arrange
      const tenantId = 'non-existent-id';

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act & Assert
      await expect(service.activate(tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate active tenant successfully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const activeTenant = createMockTenant({
        id: tenantId,
        status: TenantStatus.ACTIVE,
      });
      const deactivatedTenant = createMockTenant({
        id: tenantId,
        status: TenantStatus.SUSPENDED,
        deletedAt: new Date(),
      });

      tenantRepository.findOne.mockResolvedValue(activeTenant);
      tenantRepository.save.mockResolvedValue(deactivatedTenant);

      // Act
      const result = await service.deactivate(tenantId);

      // Assert
      expect(result).toEqual(deactivatedTenant);
      expect(tenantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tenantId,
          status: TenantStatus.SUSPENDED,
          deletedAt: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException when tenant is already inactive', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const inactiveTenant = createMockTenant({
        id: tenantId,
        status: TenantStatus.INACTIVE,
      });

      tenantRepository.findOne.mockResolvedValue(inactiveTenant);

      // Act & Assert
      await expect(service.deactivate(tenantId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deactivate(tenantId)).rejects.toThrow(
        'Tenant is already inactive',
      );
    });

    it('should throw NotFoundException when tenant not found for deactivation', async () => {
      // Arrange
      const tenantId = 'non-existent-id';

      tenantRepository.findOne.mockResolvedValue(undefined as any);

      // Act & Assert
      await expect(service.deactivate(tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle large datasets in findAll', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({ limit: 1000 });
      const largeTenantArray = Array.from({ length: 1000 }, (_, i) =>
        createMockTenant({ id: `tenant-${i}` }),
      );

      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi
          .fn()
          .mockResolvedValue([largeTenantArray, largeTenantArray.length]),
      };

      tenantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      const result = await service.findAll(filterDto);

      // Assert
      expect(result.data).toHaveLength(1000);
      expect(result.meta.total).toBe(1000);
    });

    it('should handle concurrent create operations', async () => {
      // Arrange
      const createDto1 = createMockCreateTenantDto({ code: 'tenant1' });
      const createDto2 = createMockCreateTenantDto({ code: 'tenant2' });

      tenantRepository.findOne.mockResolvedValue(undefined as any);
      tenantRepository.create
        .mockReturnValueOnce(createMockTenant({ code: 'tenant_tenant1' }))
        .mockReturnValueOnce(createMockTenant({ code: 'tenant_tenant2' }));
      tenantRepository.save
        .mockResolvedValueOnce(createMockTenant({ code: 'tenant_tenant1' }))
        .mockResolvedValueOnce(createMockTenant({ code: 'tenant_tenant2' }));

      // Act
      const [result1, result2] = await Promise.all([
        service.create(createDto1),
        service.create(createDto2),
      ]);

      // Assert
      expect(result1.code).toBe('tenant_tenant1');
      expect(result2.code).toBe('tenant_tenant2');
    });

    it('should handle null and undefined values gracefully', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto({
        description: undefined,
        entityCustomSettings: undefined,
      });
      const expectedTenant = createMockTenant({ description: undefined });

      tenantRepository.findOne.mockResolvedValue(undefined as any);
      tenantRepository.create.mockReturnValue(expectedTenant);
      tenantRepository.save.mockResolvedValue(expectedTenant);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(expectedTenant);
      expect(result.description).toBeUndefined();
    });

    it('should maintain data integrity during updates', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const originalTenant = createMockTenant({
        id: tenantId,
        createdAt: new Date('2024-01-01'),
      });
      const updateDto = createMockUpdateTenantDto({ name: 'New Name' });

      tenantRepository.findOne.mockResolvedValue(originalTenant);
      tenantRepository.save.mockImplementation(tenant =>
        Promise.resolve(tenant),
      );

      // Act
      const result = await service.update(tenantId, updateDto);

      // Assert
      expect(result.id).toBe(tenantId);
      expect(result.name).toBe('New Name');
      expect(result.createdAt).toEqual(originalTenant.createdAt); // Should not change
    });
  });

  describe('Input Validation', () => {
    it('should handle empty string inputs', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({ search: '' });

      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      tenantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Object),
      );
    });

    it('should handle special characters in search', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({
        search: "test'tenant%_",
      });

      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      tenantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(tenant.name ILIKE :search OR tenant.code ILIKE :search OR tenant.description ILIKE :search)',
        { search: "%test'tenant%_%" },
      );
    });
  });
});
