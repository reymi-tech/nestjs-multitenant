import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TenantStatus } from '../../constants';
import { IEntityConfig, ITenant } from '../interface/tenant.interface';

/**
 * Tenant entity stored in the public/admin schema
 * Contains tenant metadata and configuration
 */
@Entity('tenants')
@Index(['code'], { unique: true, where: '"deletedAt" IS NULL' })
export class Tenant implements ITenant {
  /**
   * Unique identifier for the tenant
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Unique tenant code used as schema name
   * Format: tenant_{code}
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  /**
   * Display name for the tenant
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Optional description of the tenant
   */
  @Column({ type: 'text', nullable: true })
  description?: string | undefined;

  /**
   * Current status of the tenant
   */
  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  @Index()
  status!: TenantStatus;

  /**
   * Custom settings for the tenant
   */
  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, unknown>;

  /**
   * Entity configuration for this tenant
   * Defines which entities are enabled and their settings
   */
  @Column({ type: 'jsonb', nullable: true })
  entityConfig?: IEntityConfig;

  /**
   * Timestamp when the tenant was created
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Timestamp when the tenant was last updated
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Timestamp when the tenant was soft-deleted
   */
  @DeleteDateColumn()
  deletedAt?: Date;

  /**
   * Get the schema name for this tenant
   */
  getSchemaName(): string {
    return this.code;
  }

  /**
   * Check if the tenant is active (not soft-deleted)
   */
  isActive(): boolean {
    return this.status === TenantStatus.ACTIVE && !this.deletedAt;
  }

  /**
   * Get the list of enabled entities for this tenant
   */
  getEnabledEntities(): string[] {
    return this.entityConfig?.enabledEntities || [];
  }

  /**
   * Check if a specific entity is enabled for this tenant
   */
  isEntityEnabled(entityName: string): boolean {
    return this.getEnabledEntities().includes(entityName);
  }

  /**
   * Get custom settings for a specific entity
   */
  getEntitySettings(entityName: string): Record<string, unknown> {
    const settings = this.entityConfig?.customSettings?.[entityName];
    return (settings as Record<string, unknown>) || {};
  }
}
