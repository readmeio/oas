/**
 * Portions of this file have been extracted and modified from Swagger UI.
 *
 * @license Apache-2.0
 * @see {@link https://github.com/swagger-api/swagger-ui/blob/master/src/core/utils.js}
 */
import type { SchemaObject } from '../types.js';

import { isObject } from '../lib/helpers.js';

export function usesPolymorphism(schema: SchemaObject): 'allOf' | 'anyOf' | 'oneOf' | false {
  if (schema.oneOf) {
    return 'oneOf';
  } else if (schema.anyOf) {
    return 'anyOf';
  } else if (schema.allOf) {
    return 'allOf';
  }

  return false;
}

export function objectify(thing: Record<string, unknown> | unknown): Record<string, any> {
  if (!isObject(thing)) {
    return {};
  }

  return thing;
}

export function normalizeArray(arr: (number | string)[] | number | string): (number | string)[] {
  if (Array.isArray(arr)) {
    return arr;
  }

  return [arr];
}

// biome-ignore lint/complexity/noBannedTypes: This is part of a type guard.
export function isFunc(thing: unknown): thing is Function {
  return typeof thing === 'function';
}

// Deeply strips a specific key from an object.
//
// `predicate` can be used to discriminate the stripping further,
// by preserving the key's place in the object based on its value.
// @todo make this have a better type than `any`
export function deeplyStripKey(
  input: unknown,
  keyToStrip: string,
  predicate = (obj: unknown, key?: string): boolean => true,
): SchemaObject | any {
  if (typeof input !== 'object' || Array.isArray(input) || input === null || !keyToStrip) {
    return input;
  }

  const obj = { ...input } as Record<string, SchemaObject>;

  Object.keys(obj).forEach(k => {
    if (k === keyToStrip && predicate(obj[k], k)) {
      delete obj[k];
      return;
    }

    obj[k] = deeplyStripKey(obj[k], keyToStrip, predicate);
  });

  return obj;
}
