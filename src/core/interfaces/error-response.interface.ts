export interface ErrorDetails {
  databaseError?: {
    query?: string;
    parameters?: unknown[];
    driverError?: {
      code?: string;
      severity?: string;
      detail?: string;
      hint?: string;
    };
  };
  entity?: {
    entityName?: string;
    entityId?: string | number;
  };
  tenant?: {
    code?: string;
    schema?: string;
    connectionType?: string;
    invalidCode?: string;
    validationErrors?: string[];
    conflictingCode?: string;
  };
  connection?: {
    tenantCode?: string;
    suggestion?: string;
  };
  database?: {
    operation?: string;
    table?: string;
    schema?: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category: 'DATABASE' | 'TENANT' | 'CONNECTION' | 'VALIDATION' | 'SYSTEM';
    statusCode: number;
    timestamp: string;
    traceId: string;
    details?: ErrorDetails;
    request?: {
      method: string;
      url: string;
      tenantCode?: string;
    };
  };
}

export interface ValidationError extends ErrorResponse {
  error: ErrorResponse['error'] & {
    fields: string[];
  };
}
