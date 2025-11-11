import type { ErrorDetails, WarningDetails } from '@readme/openapi-parser';

export class ValidationError extends Error {
  errors: ErrorDetails[];
  warnings: WarningDetails[];

  constructor(
    message: string,
    {
      errors,
      warnings,
    }: {
      errors?: ErrorDetails[];
      warnings?: WarningDetails[];
    } = {},
  ) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors || [];
    this.warnings = warnings || [];
  }
}
