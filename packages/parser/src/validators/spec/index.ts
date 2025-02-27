import type { ValidationError, ValidationWarning } from '../../types.js';

export abstract class SpecificationValidator {
  errors: ValidationError[] = [];

  warnings: ValidationWarning[] = [];

  protected reportError(message: string): void {
    this.errors.push({ message });
  }

  protected reportWarning(message: string): void {
    this.warnings.push({ message });
  }

  abstract run(): void;
}
