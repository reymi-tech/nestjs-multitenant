import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantAdminController } from '../../../../src/admin/controllers/tenant-admin.controller';
import { CreateTenantDto } from '../../../../src/admin/dto/create-tenant.dto';
import { TenantFilterDto } from '../../../../src/admin/dto/filter-tenant.dto';
import { UpdateTenantDto } from '../../../../src/admin/dto/update-tenant.dto';
import { Tenant } from '../../../../src/admin/entities/tenant.entity';
import {
  FindAllTenants,
  ITenantAdminService,
  TenantStats,
} from '../../../../src/admin/interfaces/tenant-admin.interface';
import { TenantStatus } from '../../../../src/constants';
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
    enabledEntities: ['user', 'role'],
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
  dto.enabledEntities = ['user', 'role'];
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

const createMockFindAllTenants = (
  overrides?: Partial<FindAllTenants>,
): FindAllTenants => {
  return {
    data: [createMockTenant()],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    ...overrides,
  };
};

const createMockTenantStats = (
  overrides?: Partial<TenantStats>,
): TenantStats => {
  return {
    total: 100,
    active: 80,
    inactive: 10,
    suspended: 5,
    pending: 5,
    ...overrides,
  };
};

describe('TenantAdminController', () => {
  let controller: TenantAdminController;
  let tenantAdminService: Mock<ITenantAdminService>;

  beforeEach(() => {
    // Crear mock del servicio
    tenantAdminService = createMock<ITenantAdminService>();

    // Crear instancia del controlador directamente
    controller = new TenantAdminController(tenantAdminService);

    // Limpiar mocks
    vi.clearAllMocks();
  });

  describe('POST /admin/tenant (create)', () => {
    it('should create a tenant successfully', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto();
      const expectedTenant = createMockTenant();

      tenantAdminService.create.mockResolvedValue(expectedTenant);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(expectedTenant);
      expect(tenantAdminService.create).toHaveBeenCalledWith(createDto);
      expect(tenantAdminService.create).toHaveBeenCalledTimes(1);
    });

    it('should handle ConflictException when tenant code already exists', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto();
      const conflictError = new ConflictException(
        'Tenant with code tenant_test already exists',
      );

      tenantAdminService.create.mockRejectedValue(conflictError);

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.create(createDto)).rejects.toThrow(
        'Tenant with code tenant_test already exists',
      );
      expect(tenantAdminService.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle BadRequestException for invalid data', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto({ code: 'INVALID-CODE!' });
      const badRequestError = new BadRequestException('Invalid tenant data');

      tenantAdminService.create.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(tenantAdminService.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle empty request body', async () => {
      // Arrange
      const emptyDto = {} as CreateTenantDto;
      const badRequestError = new BadRequestException(
        'Failed to create tenant',
      );

      tenantAdminService.create.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.create(emptyDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(tenantAdminService.create).toHaveBeenCalledWith(emptyDto);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const createDto = createMockCreateTenantDto();
      const serviceError = new Error('Database connection failed');

      tenantAdminService.create.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(tenantAdminService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('GET /admin/tenant (findAll)', () => {
    it('should return paginated tenants with default filters', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto();
      const expectedResult = createMockFindAllTenants();

      tenantAdminService.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll(filterDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(tenantAdminService.findAll).toHaveBeenCalledWith(filterDto);
      expect(tenantAdminService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle search query parameter', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({ search: 'test' });
      const expectedResult = createMockFindAllTenants({
        data: [createMockTenant({ name: 'Test Tenant' })],
      });

      tenantAdminService.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll(filterDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(tenantAdminService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' }),
      );
    });

    it('should handle status filter parameter', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({
        status: TenantStatus.ACTIVE,
      });
      const expectedResult = createMockFindAllTenants({
        data: [createMockTenant({ status: TenantStatus.ACTIVE })],
      });

      tenantAdminService.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll(filterDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(tenantAdminService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: TenantStatus.ACTIVE }),
      );
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({ page: 2, limit: 5 });
      const expectedResult = createMockFindAllTenants({
        meta: { total: 15, page: 2, limit: 5, totalPages: 3 },
      });

      tenantAdminService.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll(filterDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(tenantAdminService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 5 }),
      );
    });

    it('should handle sorting parameters', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto({
        sortBy: 'name',
        sortOrder: 'ASC',
      });
      const expectedResult = createMockFindAllTenants();

      tenantAdminService.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll(filterDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(tenantAdminService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'name', sortOrder: 'ASC' }),
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto();
      const emptyResult = createMockFindAllTenants({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      tenantAdminService.findAll.mockResolvedValue(emptyResult);

      // Act
      const result = await controller.findAll(filterDto);

      // Assert
      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should handle service errors', async () => {
      // Arrange
      const filterDto = createMockTenantFilterDto();
      const serviceError = new Error('Database query failed');

      tenantAdminService.findAll.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.findAll(filterDto)).rejects.toThrow(
        'Database query failed',
      );
      expect(tenantAdminService.findAll).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('GET /admin/tenant/:id (findOne)', () => {
    it('should return a tenant by id', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedTenant = createMockTenant({ id: tenantId });

      tenantAdminService.findOne.mockResolvedValue(expectedTenant);

      // Act
      const result = await controller.findOne(tenantId);

      // Assert
      expect(result).toEqual(expectedTenant);
      expect(tenantAdminService.findOne).toHaveBeenCalledWith(tenantId);
      expect(tenantAdminService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should handle NotFoundException when tenant not found', async () => {
      // Arrange
      const tenantId = 'non-existent-id';
      const notFoundError = new NotFoundException(
        `Tenant with ID ${tenantId} not found`,
      );

      tenantAdminService.findOne.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.findOne(tenantId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne(tenantId)).rejects.toThrow(
        `Tenant with ID ${tenantId} not found`,
      );
      expect(tenantAdminService.findOne).toHaveBeenCalledWith(tenantId);
    });

    it('should handle invalid UUID format', async () => {
      // Arrange
      const invalidId = 'invalid-uuid';
      const badRequestError = new BadRequestException(
        'Invalid tenant ID format',
      );

      tenantAdminService.findOne.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.findOne(invalidId)).rejects.toThrow(
        BadRequestException,
      );
      expect(tenantAdminService.findOne).toHaveBeenCalledWith(invalidId);
    });

    it('should handle empty id parameter', async () => {
      // Arrange
      const emptyId = '';
      const badRequestError = new BadRequestException('Tenant ID is required');

      tenantAdminService.findOne.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.findOne(emptyId)).rejects.toThrow(
        BadRequestException,
      );
      expect(tenantAdminService.findOne).toHaveBeenCalledWith(emptyId);
    });
  });

  describe('PATCH /admin/tenant/:id (update)', () => {
    it('should update a tenant successfully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto = createMockUpdateTenantDto();
      const updatedTenant = createMockTenant({
        id: tenantId,
        name: updateDto.name,
        description: updateDto.description,
      });

      tenantAdminService.update.mockResolvedValue(updatedTenant);

      // Act
      const result = await controller.update(tenantId, updateDto);

      // Assert
      expect(result).toEqual(updatedTenant);
      expect(tenantAdminService.update).toHaveBeenCalledWith(
        tenantId,
        updateDto,
      );
      expect(tenantAdminService.update).toHaveBeenCalledTimes(1);
    });

    it('should handle NotFoundException when tenant not found for update', async () => {
      // Arrange
      const tenantId = 'non-existent-id';
      const updateDto = createMockUpdateTenantDto();
      const notFoundError = new NotFoundException(
        `Tenant with ID ${tenantId} not found`,
      );

      tenantAdminService.update.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.update(tenantId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tenantAdminService.update).toHaveBeenCalledWith(
        tenantId,
        updateDto,
      );
    });

    it('should handle partial updates', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const partialUpdateDto = { name: 'New Name Only' } as UpdateTenantDto;
      const updatedTenant = createMockTenant({
        id: tenantId,
        name: 'New Name Only',
      });

      tenantAdminService.update.mockResolvedValue(updatedTenant);

      // Act
      const result = await controller.update(tenantId, partialUpdateDto);

      // Assert
      expect(result).toEqual(updatedTenant);
      expect(tenantAdminService.update).toHaveBeenCalledWith(
        tenantId,
        partialUpdateDto,
      );
    });

    it('should handle empty update body', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const emptyUpdateDto = {} as UpdateTenantDto;
      const existingTenant = createMockTenant({ id: tenantId });

      tenantAdminService.update.mockResolvedValue(existingTenant);

      // Act
      const result = await controller.update(tenantId, emptyUpdateDto);

      // Assert
      expect(result).toEqual(existingTenant);
      expect(tenantAdminService.update).toHaveBeenCalledWith(
        tenantId,
        emptyUpdateDto,
      );
    });

    it('should handle BadRequestException for invalid update data', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUpdateDto = createMockUpdateTenantDto({
        status: 'INVALID_STATUS' as any,
      });
      const badRequestError = new BadRequestException('Invalid update data');

      tenantAdminService.update.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(
        controller.update(tenantId, invalidUpdateDto),
      ).rejects.toThrow(BadRequestException);
      expect(tenantAdminService.update).toHaveBeenCalledWith(
        tenantId,
        invalidUpdateDto,
      );
    });
  });

  describe('DELETE /admin/tenant/:id (remove)', () => {
    it('should remove a tenant successfully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';

      tenantAdminService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(tenantId);

      // Assert
      expect(result).toBeUndefined();
      expect(tenantAdminService.remove).toHaveBeenCalledWith(tenantId);
      expect(tenantAdminService.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle NotFoundException when tenant not found for removal', async () => {
      // Arrange
      const tenantId = 'non-existent-id';
      const notFoundError = new NotFoundException(
        `Tenant with ID ${tenantId} not found`,
      );

      tenantAdminService.remove.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.remove(tenantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(tenantAdminService.remove).toHaveBeenCalledWith(tenantId);
    });

    it('should handle invalid tenant id for removal', async () => {
      // Arrange
      const invalidId = 'invalid-uuid';
      const badRequestError = new BadRequestException(
        'Invalid tenant ID format',
      );

      tenantAdminService.remove.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.remove(invalidId)).rejects.toThrow(
        BadRequestException,
      );
      expect(tenantAdminService.remove).toHaveBeenCalledWith(invalidId);
    });

    it('should handle service errors during removal', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const serviceError = new Error('Database deletion failed');

      tenantAdminService.remove.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.remove(tenantId)).rejects.toThrow(
        'Database deletion failed',
      );
      expect(tenantAdminService.remove).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('GET /admin/tenant/stats/overview (getStats)', () => {
    it('should return tenant statistics', async () => {
      // Arrange
      const expectedStats = createMockTenantStats();

      tenantAdminService.getStats.mockResolvedValue(expectedStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(expectedStats);
      expect(tenantAdminService.getStats).toHaveBeenCalledWith();
      expect(tenantAdminService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should handle zero statistics', async () => {
      // Arrange
      const zeroStats = createMockTenantStats({
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
        pending: 0,
      });

      tenantAdminService.getStats.mockResolvedValue(zeroStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(zeroStats);
      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
    });

    it('should handle large numbers in statistics', async () => {
      // Arrange
      const largeStats = createMockTenantStats({
        total: 1_000_000,
        active: 800_000,
        inactive: 150_000,
        suspended: 30_000,
        pending: 20_000,
      });

      tenantAdminService.getStats.mockResolvedValue(largeStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(largeStats);
      expect(result.total).toBe(1_000_000);
    });

    it('should handle service errors when getting stats', async () => {
      // Arrange
      const serviceError = new Error('Statistics calculation failed');

      tenantAdminService.getStats.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getStats()).rejects.toThrow(
        'Statistics calculation failed',
      );
      expect(tenantAdminService.getStats).toHaveBeenCalledWith();
    });
  });

  describe('PATCH /admin/tenant/:id/activate (activate)', () => {
    it('should activate a tenant successfully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const activatedTenant = createMockTenant({
        id: tenantId,
        status: TenantStatus.ACTIVE,
      });

      tenantAdminService.activate.mockResolvedValue(activatedTenant);

      // Act
      const result = await controller.activate(tenantId);

      // Assert
      expect(result).toEqual(activatedTenant);
      expect(result.status).toBe(TenantStatus.ACTIVE);
      expect(tenantAdminService.activate).toHaveBeenCalledWith(tenantId);
      expect(tenantAdminService.activate).toHaveBeenCalledTimes(1);
    });

    it('should handle NotFoundException when tenant not found for activation', async () => {
      // Arrange
      const tenantId = 'non-existent-id';
      const notFoundError = new NotFoundException(
        `Tenant with ID ${tenantId} not found`,
      );

      tenantAdminService.activate.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.activate(tenantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(tenantAdminService.activate).toHaveBeenCalledWith(tenantId);
    });

    it('should handle BadRequestException when tenant is already active', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const badRequestError = new BadRequestException(
        'Tenant is already active',
      );

      tenantAdminService.activate.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.activate(tenantId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.activate(tenantId)).rejects.toThrow(
        'Tenant is already active',
      );
      expect(tenantAdminService.activate).toHaveBeenCalledWith(tenantId);
    });

    it('should handle invalid tenant id for activation', async () => {
      // Arrange
      const invalidId = 'invalid-uuid';
      const badRequestError = new BadRequestException(
        'Invalid tenant ID format',
      );

      tenantAdminService.activate.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.activate(invalidId)).rejects.toThrow(
        BadRequestException,
      );
      expect(tenantAdminService.activate).toHaveBeenCalledWith(invalidId);
    });
  });

  describe('PATCH /admin/tenant/:id/deactivate (deactivate)', () => {
    it('should deactivate a tenant successfully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const deactivatedTenant = createMockTenant({
        id: tenantId,
        status: TenantStatus.SUSPENDED,
        deletedAt: new Date(),
      });

      tenantAdminService.deactivate.mockResolvedValue(deactivatedTenant);

      // Act
      const result = await controller.deactivate(tenantId);

      // Assert
      expect(result).toEqual(deactivatedTenant);
      expect(result.status).toBe(TenantStatus.SUSPENDED);
      expect(tenantAdminService.deactivate).toHaveBeenCalledWith(tenantId);
      expect(tenantAdminService.deactivate).toHaveBeenCalledTimes(1);
    });

    it('should handle NotFoundException when tenant not found for deactivation', async () => {
      // Arrange
      const tenantId = 'non-existent-id';
      const notFoundError = new NotFoundException(
        `Tenant with ID ${tenantId} not found`,
      );

      tenantAdminService.deactivate.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.deactivate(tenantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(tenantAdminService.deactivate).toHaveBeenCalledWith(tenantId);
    });

    it('should handle BadRequestException when tenant is already inactive', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const badRequestError = new BadRequestException(
        'Tenant is already inactive',
      );

      tenantAdminService.deactivate.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.deactivate(tenantId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deactivate(tenantId)).rejects.toThrow(
        'Tenant is already inactive',
      );
      expect(tenantAdminService.deactivate).toHaveBeenCalledWith(tenantId);
    });

    it('should handle invalid tenant id for deactivation', async () => {
      // Arrange
      const invalidId = 'invalid-uuid';
      const badRequestError = new BadRequestException(
        'Invalid tenant ID format',
      );

      tenantAdminService.deactivate.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.deactivate(invalidId)).rejects.toThrow(
        BadRequestException,
      );
      expect(tenantAdminService.deactivate).toHaveBeenCalledWith(invalidId);
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle concurrent requests to different endpoints', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const createDto = createMockCreateTenantDto();
      const filterDto = createMockTenantFilterDto();

      const newTenant = createMockTenant({ id: 'new-tenant-id' });
      const existingTenant = createMockTenant({ id: tenantId });
      const findAllResult = createMockFindAllTenants();

      tenantAdminService.create.mockResolvedValue(newTenant);
      tenantAdminService.findOne.mockResolvedValue(existingTenant);
      tenantAdminService.findAll.mockResolvedValue(findAllResult);

      // Act
      const [createResult, findOneResult, findAllResultConcurrent] =
        await Promise.all([
          controller.create(createDto),
          controller.findOne(tenantId),
          controller.findAll(filterDto),
        ]);

      // Assert
      expect(createResult).toEqual(newTenant);
      expect(findOneResult).toEqual(existingTenant);
      expect(findAllResultConcurrent).toEqual(findAllResult);
    });

    it('should handle null and undefined values gracefully', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto = { description: undefined } as UpdateTenantDto;
      const updatedTenant = createMockTenant({
        id: tenantId,
        description: undefined,
      });

      tenantAdminService.update.mockResolvedValue(updatedTenant);

      // Act
      const result = await controller.update(tenantId, updateDto);

      // Assert
      expect(result).toEqual(updatedTenant);
      expect(result.description).toBeUndefined();
    });

    it('should maintain proper HTTP status codes through exceptions', async () => {
      // Arrange
      const tenantId = 'non-existent-id';

      // Test different exception types
      const notFoundError = new NotFoundException('Not found');
      const badRequestError = new BadRequestException('Bad request');
      const conflictError = new ConflictException('Conflict');

      tenantAdminService.findOne
        .mockRejectedValueOnce(notFoundError)
        .mockRejectedValueOnce(badRequestError)
        .mockRejectedValueOnce(conflictError);

      // Act & Assert
      await expect(controller.findOne(tenantId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne(tenantId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findOne(tenantId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle large payload data', async () => {
      // Arrange
      const largeDescription = 'A'.repeat(10_000); // 10KB description
      const createDto = createMockCreateTenantDto({
        description: largeDescription,
      });
      const expectedTenant = createMockTenant({
        description: largeDescription,
      });

      tenantAdminService.create.mockResolvedValue(expectedTenant);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(expectedTenant);
      expect(result.description).toHaveLength(10_000);
    });

    it('should handle special characters in parameters', async () => {
      // Arrange
      const specialCharId = 'tenant-with-special-chars-!@#$%';
      const notFoundError = new NotFoundException(
        `Tenant with ID ${specialCharId} not found`,
      );

      tenantAdminService.findOne.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.findOne(specialCharId)).rejects.toThrow(
        NotFoundException,
      );
      expect(tenantAdminService.findOne).toHaveBeenCalledWith(specialCharId);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle multiple rapid requests', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const tenant = createMockTenant({ id: tenantId });

      tenantAdminService.findOne.mockResolvedValue(tenant);

      // Act - Simulate 100 rapid requests
      const promises = Array.from({ length: 100 }, () =>
        controller.findOne(tenantId),
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(100);
      for (const result of results) {
        expect(result).toEqual(tenant);
      }
      expect(tenantAdminService.findOne).toHaveBeenCalledTimes(100);
    });

    it('should handle timeout scenarios', async () => {
      // Arrange
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const timeoutError = new Error('Request timeout');

      tenantAdminService.findOne.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(controller.findOne(tenantId)).rejects.toThrow(
        'Request timeout',
      );
    });
  });

  describe('Data Validation and Type Safety', () => {
    it('should preserve data types in responses', async () => {
      // Arrange
      const tenant = createMockTenant();
      const stats = createMockTenantStats();

      tenantAdminService.findOne.mockResolvedValue(tenant);
      tenantAdminService.getStats.mockResolvedValue(stats);

      // Act
      const tenantResult = await controller.findOne(tenant.id);
      const statsResult = await controller.getStats();

      // Assert
      expect(typeof tenantResult.id).toBe('string');
      expect(tenantResult.createdAt).toBeInstanceOf(Date);
      expect(typeof statsResult.total).toBe('number');
      expect(typeof statsResult.active).toBe('number');
    });

    it('should handle boolean values correctly', async () => {
      // Arrange
      const tenant = createMockTenant();
      tenant.isActive = vi.fn().mockReturnValue(true);

      tenantAdminService.findOne.mockResolvedValue(tenant);

      // Act
      const result = await controller.findOne(tenant.id);

      // Assert
      expect(result).toEqual(tenant);
      expect(typeof result.isActive()).toBe('boolean');
    });
  });
});
