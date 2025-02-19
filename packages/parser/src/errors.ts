import type { ErrorObject } from 'ajv';

export class ValidationError extends Error {
  details: ErrorObject[];

  totalErrors: number;

  constructor(message: string, data?: { details: ErrorObject[]; totalErrors: number }) {
    super(message);

    this.name = 'ValidationError';
    this.details = data?.details || [];
    this.totalErrors = data?.totalErrors || 0;
  }
}
