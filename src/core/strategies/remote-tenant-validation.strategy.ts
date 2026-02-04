import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { Tenant } from '../../admin/entities/tenant.entity';
import { ITenantValidationStrategy } from '../../admin/interfaces/tenant-validation.interface';

@Injectable()
export class RemoteTenantValidationStrategy
  implements ITenantValidationStrategy
{
  constructor(
    private readonly httpService: HttpService,
    private readonly basePath: string,
  ) {}

  /**
   * Validates whether a tenant with the specified code exists
   *
   * @param tenantCode The tenant code
   * @returns A promise that resolves to true if the tenant exists, false otherwise
   */
  async validateTenantExists(tenantCode: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.basePath}/admin/tenant/validate/${tenantCode}`,
        ),
      );
      return response.data.exists;
    } catch {
      return false;
    }
  }

  /**
   * Finds a tenant by its code
   *
   * @param code The tenant code
   * @returns A promise that resolves to the tenant entity with the specified code, or undefined if no tenant is found
   */
  async findByCode(code: string): Promise<Tenant | undefined> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.basePath}/admin/tenant/code/${code}`),
      );
      return response.data;
    } catch {
      return undefined;
    }
  }
}
