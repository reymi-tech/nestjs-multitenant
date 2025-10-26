import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EntityName, REGEX_TENANT_NAME, TenantStatus } from 'src/constants';

export class CreateTenantDto {
  /**
   * Tenant code, must be unique and contain only lowercase letters, numbers, and underscores
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(REGEX_TENANT_NAME, {
    message:
      'Code must contain only lowercase letters, numbers, and underscores',
  })
  code!: string;

  /**
   * Display name for the tenant
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  /**
   * Optional description for the tenant
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  /**
   * Tenant status
   */
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  /**
   * Custom settings for the tenant
   */
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  /**
   * Entity preset to use for the tenant
   */
  @IsOptional()
  @IsString()
  entityPreset?: string;

  /**
   * List of entities to enable for the tenant
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enableEntities?: EntityName[];

  /**
   * Custom settings for the enabled entities
   */
  @IsOptional()
  @IsObject()
  entityCustomSettings?: Record<string, unknown>;
}
