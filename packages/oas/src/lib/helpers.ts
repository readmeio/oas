import type { SchemaObject } from 'rmoas.types';

export function hasSchemaType(schema: SchemaObject, discriminator: 'array' | 'object') {
  if (Array.isArray(schema.type)) {
    return schema.type.includes(discriminator);
  }

  return schema.type === discriminator;
}

export function isObject(val: unknown) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function isPrimitive(val: unknown): boolean {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}
