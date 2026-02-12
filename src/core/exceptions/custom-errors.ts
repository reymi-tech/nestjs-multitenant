export class NoTenantContextError extends Error {
  constructor(
    message: string = 'Tenant context is required for this operation',
  ) {
    super(message);
    this.name = 'NoTenantContextError';
  }
}

export class InvalidTenantCodeError extends Error {
  constructor(
    public readonly tenantCode: string,
    message: string = `Invalid tenant code: ${tenantCode}`,
  ) {
    super(message);
    this.name = 'InvalidTenantCodeError';
  }
}

export class SchemaNotFoundError extends Error {
  constructor(
    public readonly tenantCode: string,
    message: string = `Schema not found for tenant: ${tenantCode}`,
  ) {
    super(message);
    this.name = 'SchemaNotFoundError';
  }
}

export class ConnectionPoolExhaustedError extends Error {
  constructor(
    public readonly tenantCode: string,
    message: string = `Connection pool exhausted for tenant: ${tenantCode}`,
  ) {
    super(message);
    this.name = 'ConnectionPoolExhaustedError';
  }
}

export class InvalidConnectionTypeError extends Error {
  constructor(
    public readonly connectionType: string,
    message: string = `Invalid connection type: ${connectionType}`,
  ) {
    super(message);
    this.name = 'InvalidConnectionTypeError';
  }
}

export class TenantValidationError extends Error {
  constructor(
    public readonly validationErrors: string[],
    message: string = 'Tenant validation failed',
  ) {
    super(message);
    this.name = 'TenantValidationError';
  }
}

export class TenantConflictError extends Error {
  constructor(
    public readonly tenantCode: string,
    message: string = `Tenant with code ${tenantCode} already exists`,
  ) {
    super(message);
    this.name = 'TenantConflictError';
  }
}

export class TransactionFailedError extends Error {
  constructor(
    public readonly operation: string,
    public readonly reason: string,
    message: string = `Transaction failed for operation: ${operation}`,
  ) {
    super(message);
    this.name = 'TransactionFailedError';
  }
}
