export function isPrimitive(val: unknown): boolean {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}
