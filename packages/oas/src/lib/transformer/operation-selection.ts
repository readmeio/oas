/**
 * Track selected HTTP operations within OpenAPI paths or webhooks. Container keys and HTTP methods
 * are matched without regard to casing.
 */
export class OperationSelection {
  private selections: Map<string, '*' | Set<string>> = new Map();

  /** Whether any paths or webhooks have been selected. */
  get hasSelections(): boolean {
    return this.selections.size > 0;
  }

  /**
   * Select every operation within a path or webhook.
   *
   * @param key Path or webhook key whose operations should be selected.
   */
  addAll(key: string): void {
    this.selections.set(this.normalize(key), '*');
  }

  /**
   * Add an operation to the selection for a path or webhook. If every operation for the key is
   * already selected, that selection remains unchanged.
   *
   * @param key Path or webhook key that contains the operation.
   * @param method HTTP method of the operation to select.
   */
  addOperation(key: string, method: string): void {
    const normalizedKey = this.normalize(key);
    const normalizedMethod = this.normalize(method);
    const selection = this.selections.get(normalizedKey);

    if (selection === '*') {
      return;
    }

    if (selection instanceof Set) {
      selection.add(normalizedMethod);
      return;
    }

    this.selections.set(normalizedKey, new Set([normalizedMethod]));
  }

  /**
   * Clear every operation selection for a path or webhook.
   *
   * @param key Path or webhook key to clear.
   */
  clear(key: string): void {
    this.selections.delete(this.normalize(key));
  }

  /**
   * Determine whether a path or webhook has any selected operations.
   *
   * @param key Path or webhook key to check.
   */
  has(key: string): boolean {
    return this.selections.has(this.normalize(key));
  }

  /**
   * Determine whether every operation within a path or webhook is selected.
   *
   * @param key Path or webhook key to check.
   */
  matchesAll(key: string): boolean {
    return this.selections.get(this.normalize(key)) === '*';
  }

  /**
   * Determine whether an operation is selected.
   *
   * @param key Path or webhook key that contains the operation.
   * @param method HTTP method of the operation to check.
   */
  matches(key: string, method: string): boolean {
    const selection = this.selections.get(this.normalize(key));
    return selection === '*' || Boolean(selection?.has(this.normalize(method)));
  }

  /** Normalize path, webhook, and method casing for comparisons. */
  private normalize(value: string): string {
    return value.toLowerCase();
  }
}
