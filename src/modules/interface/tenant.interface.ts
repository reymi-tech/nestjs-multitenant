import { TenantStatus } from 'src/constants';

export interface IEntityConfig {
  enabledEntities: string[];
  preset?: string;
  customSettings?: Record<string, unknown>;
}

export interface ITenant {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: TenantStatus;
  settings?: Record<string, unknown>;
  entityConfig?: IEntityConfig;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
