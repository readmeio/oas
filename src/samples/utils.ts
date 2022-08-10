/**
 * Portions of this file have been extracted and modified from Swagger UI.
 *
 * @license Apache-2.0
 * @see {@link https://github.com/swagger-api/swagger-ui/blob/master/src/core/utils.js}
 */
import type * as RMOAS from '../rmoas.types';

function isObject(obj: unknown) {
  return !!obj && typeof obj === 'object';
}

export function usesPolymorphism(schema: RMOAS.SchemaObject) {
  if (schema.oneOf) {
    return 'oneOf';
  } else if (schema.anyOf) {
    return 'anyOf';
  } else if (schema.allOf) {
    return 'allOf';
  }

  return false;
}

export function objectify(thing: unknown | Record<string, unknown>): Record<string, any> {
  if (!isObject(thing)) {
    return {};
  }

  return thing;
}

export function normalizeArray(arr: string | number | (string | number)[]) {
  if (Array.isArray(arr)) {
    return arr;
  }

  return [arr];
}

// eslint-disable-next-line @typescript-eslint/ban-types
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
  predicate = (obj: unknown, key?: string): boolean => true // eslint-disable-line @typescript-eslint/no-unused-vars
): any | RMOAS.SchemaObject {
  if (typeof input !== 'object' || Array.isArray(input) || input === null || !keyToStrip) {
    return input;
  }

  const obj = { ...input } as Record<string, RMOAS.SchemaObject>;

  Object.keys(obj).forEach(k => {
    if (k === keyToStrip && predicate(obj[k], k)) {
      delete obj[k];
      return;
    }

    obj[k] = deeplyStripKey(obj[k], keyToStrip, predicate);
  });

  return obj;
}
