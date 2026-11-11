import type { HttpMethods, OASDocument, OperationObject, PathItemObject } from '../types.js';

import { isOpenAPI32 } from '../types.js';
import { supportedMethods } from '../utils.js';

const httpMethods: ReadonlySet<string> = new Set(supportedMethods);

/**
 * A fixed Path Item method (`get`, `query`, …), matched case-insensitively. `GET` and `get` are
 * the same method. Custom methods such as `COPY` are not.
 *
 */
export function isHttpMethod(method: string): method is HttpMethods {
  return httpMethods.has(method.toLowerCase());
}

/**
 * Case-insensitively find the real key for a given target. An exact match wins, and the returned
 * key keeps the casing stored in the document so pointers stay accurate.
 *
 * OpenAPI paths and HTTP methods are not case-sensitive as far as this library is concerned.
 *
 */
export function resolveKey(keys: string[], target: string): string | undefined {
  return keys.find(key => key === target) || keys.find(key => key.toLowerCase() === target.toLowerCase());
}

/**
 * An operation declared on a fixed Path Item method field (`get`, `query`).
 *
 */
interface FixedPathItemOperation {
  location: 'fixed';
  method: HttpMethods;
  operation: OperationObject;
  /** Pointer segments relative to the Path Item, e.g. `['get']`. */
  segments: readonly [HttpMethods];
}

/**
 * An operation declared in an OpenAPI 3.2 `additionalOperations` map (`COPY`).
 *
 */
interface AdditionalPathItemOperation {
  location: 'additional';
  method: string;
  operation: OperationObject;
  /** Pointer segments relative to the Path Item, e.g. `['additionalOperations', 'COPY']`. */
  segments: readonly ['additionalOperations', string];
}

/**
 * An operation declared on a Path Item. `location` distinguishes a fixed method field from an
 * OpenAPI 3.2 `additionalOperations` entry, and `method` keeps the casing stored in the document.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
 */
export type PathItemOperationEntry = AdditionalPathItemOperation | FixedPathItemOperation;

function isOperationEntry(value: unknown): value is OperationObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function additionalOperationsOf(pathItem: PathItemObject): Record<string, OperationObject> | undefined {
  const additional = pathItem.additionalOperations;
  if (!additional || typeof additional !== 'object' || Array.isArray(additional)) {
    return undefined;
  }

  return additional;
}

function fixedOperation(method: HttpMethods, operation: OperationObject): FixedPathItemOperation {
  return {
    location: 'fixed',
    method,
    operation,
    segments: [method],
  };
}

function additionalOperation(method: string, operation: OperationObject): AdditionalPathItemOperation {
  return {
    location: 'additional',
    method,
    operation,
    segments: ['additionalOperations', method],
  };
}

/**
 * Every HTTP operation on a Path Item. Fixed method fields come first. OpenAPI 3.2
 * `additionalOperations` entries follow, except keys that repeat a fixed method (`GET`, `Query`),
 * which the specification does not allow there.
 *
 * The Path Item is not dereferenced. A `$ref` Path Item that also declares its own operations
 * still contributes those operations.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
 */
export function listPathItemOperations(
  pathItem: PathItemObject | null | undefined,
  definition: OASDocument,
): PathItemOperationEntry[] {
  if (!pathItem || typeof pathItem !== 'object') {
    return [];
  }

  const operations: PathItemOperationEntry[] = [];

  Object.keys(pathItem).forEach(method => {
    if (!isHttpMethod(method)) {
      return;
    }

    const operation = pathItem[method];
    if (!isOperationEntry(operation)) {
      return;
    }

    operations.push(fixedOperation(method, operation));
  });

  if (!isOpenAPI32(definition)) {
    return operations;
  }

  const additionalOperations = additionalOperationsOf(pathItem);
  if (!additionalOperations) {
    return operations;
  }

  Object.keys(additionalOperations).forEach(method => {
    if (isHttpMethod(method)) {
      return;
    }

    const operation = additionalOperations[method];
    if (!isOperationEntry(operation)) {
      return;
    }

    operations.push(additionalOperation(method, operation));
  });

  return operations;
}

/**
 * Locate one operation on a Path Item by method. Fixed fields are checked first, then, for
 * OpenAPI 3.2 definitions, `additionalOperations`. Matching is case-insensitive and the returned
 * entry keeps the document's method key.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
 */
export function findPathItemOperation(
  pathItem: PathItemObject | null | undefined,
  definition: OASDocument,
  method: string,
): PathItemOperationEntry | undefined {
  const entries = listPathItemOperations(pathItem, definition);
  // Fixed methods are listed first, so an exact or case-insensitive match prefers `get` over a
  // custom method of the same name.
  const methodKey = resolveKey(
    entries.map(entry => entry.method),
    method,
  );
  if (!methodKey) {
    return undefined;
  }

  return entries.find(entry => entry.method === methodKey);
}

/**
 * Shallow-copy a Path Item, including its `additionalOperations` map, so later deletes do not
 * change the document the copy came from.
 *
 */
export function clonePathItem(pathItem: PathItemObject): PathItemObject {
  const clone: PathItemObject = { ...pathItem };
  const additionalOperations = additionalOperationsOf(pathItem);
  if (additionalOperations) {
    clone.additionalOperations = { ...additionalOperations };
  }

  return clone;
}

/**
 * Delete an operation from a Path Item. Removing the last `additionalOperations` entry deletes
 * the map as well, so the Path Item does not look like it still has operations.
 *
 */
export function removePathItemOperation(pathItem: PathItemObject, entry: PathItemOperationEntry): void {
  if (entry.location === 'additional') {
    const additionalOperations = additionalOperationsOf(pathItem);
    if (!additionalOperations) {
      return;
    }

    delete additionalOperations[entry.method];
    if (!Object.keys(additionalOperations).length) {
      delete pathItem.additionalOperations;
    }

    return;
  }

  delete pathItem[entry.method];
}

/**
 * Place an operation onto a Path Item, under its fixed method field or inside
 * `additionalOperations`, matching where {@link listPathItemOperations} found it.
 *
 */
export function assignPathItemOperation(
  pathItem: PathItemObject,
  entry: PathItemOperationEntry,
  operation: OperationObject,
): void {
  if (entry.location === 'additional') {
    const additionalOperations = additionalOperationsOf(pathItem) ?? {};
    additionalOperations[entry.method] = operation;
    pathItem.additionalOperations = additionalOperations;
    return;
  }

  pathItem[entry.method] = operation;
}
