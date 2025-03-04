import type { ErrorDetails, WarningDetails } from '../../types.js';

export abstract class SpecificationValidator {
  errors: ErrorDetails[] = [];

  warnings: WarningDetails[] = [];

  protected reportError(message: string): void {
    this.errors.push({ message });
  }

  protected reportWarning(message: string): void {
    this.warnings.push({ message });
  }

  abstract run(): void;
}
