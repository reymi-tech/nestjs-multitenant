import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TenantStatus } from 'src/constants';

/**
 * DTO for filtering tenants
 */
export class TenantFilterDto {
  /**
   * Search for tenants by name, code or description
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter tenants by status
   */
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  /**
   * Field to sort by
   */
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'code' | 'status' | 'createdAt' | 'updatedAt';

  /**
   * Sort order (asc or desc)
   */
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  /**
   * Page number for pagination
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  /**
   * Number of items per page
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
