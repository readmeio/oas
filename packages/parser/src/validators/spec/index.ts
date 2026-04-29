import type { ErrorDetails, WarningDetails } from '../../types.js';

export abstract class SpecificationValidator {
  errors: ErrorDetails[] = [];

  warnings: WarningDetails[] = [];

  /**
   * Instance paths flagged by `runPreSchemaChecks()`. Used to suppress AJV `oneOf` noise that
   * the pre-schema validator has already produced a clearer error or warning for.
   */
  flaggedInstancePaths: string[] = [];

  protected reportError(message: string): void {
    this.errors.push({ message });
  }

  protected reportWarning(message: string): void {
    this.warnings.push({ message });
  }

  protected flagInstancePath(path: string): void {
    if (!this.flaggedInstancePaths.includes(path)) {
      this.flaggedInstancePaths.push(path);
    }
  }

  abstract run(): void;

  abstract runPreSchemaChecks(): void;
}
