export abstract class SpecificationValidator {
  errors: { message: string }[] = [];

  warnings: { message: string }[] = [];

  protected reportError(message: string, context?: any): void {
    this.errors.push({ message });
  }

  protected reportWarning(message: string, context?: any): void {
    this.warnings.push({ message });
  }

  abstract run(): void;
}
