/* eslint-disable jsdoc/require-jsdoc */
/**
 * Portions of this file have been extracted and modified from Swagger UI.
 *
 * @license Apache-2.0
 * @see {@link https://github.com/swagger-api/swagger-ui/blob/master/src/core/utils.js}
 */

import * as RMOAS from '../rmoas.types';

function isObject(obj: unknown): boolean {
  return !!obj && typeof obj === 'object';
}

export function usesPolymorphism(schema: RMOAS.SchemaObject): RMOAS.Polymorphism | false {
  if (schema.oneOf) {
    return RMOAS.Polymorphism.oneOf;
  } else if (schema.anyOf) {
    return RMOAS.Polymorphism.anyOf;
  } else if (schema.allOf) {
    return RMOAS.Polymorphism.allOf;
  }

  return false;
}

export function objectify(thing: unknown | Record<string, unknown>): Record<string, any> {
  if (!isObject(thing)) {
    return {};
  }

  return thing;
}

export function normalizeArray(arr: primitive | Array<primitive>): Array<primitive> {
  if (Array.isArray(arr)) {
    return arr;
  }

  return [arr];
}

export function isFunc(thing: unknown): boolean {
  return typeof thing === 'function';
}

// Deeply strips a specific key from an object.
//
// `predicate` can be used to discriminate the stripping further,
// by preserving the key's place in the object based on its value.
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
