import type { SchemaObject } from '../types.js';

export function hasSchemaType(schema: SchemaObject, discriminator: 'array' | 'object'): boolean {
  if (Array.isArray(schema.type)) {
    return schema.type.includes(discriminator);
  }

  return schema.type === discriminator;
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function isPrimitive(val: unknown): val is boolean | number | string {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}
