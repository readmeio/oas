import type { OASDocument, OperationObject } from '../../types.js';
import type { ResponseExample } from './get-response-examples.js';

import { dereferenceRef } from '../../lib/refs.js';
import { isRef } from '../../types.js';

import { getResponseExamples } from './get-response-examples.js';

export interface CallbackExample {
  example: ResponseExample[];
  expression: string;
  identifier: string;
  method: string;
}

/**
 * With an OpenAPI Operation Object return back a collection of examples for any callbacks that may
 * be present.
 *
 * @param operation Operation to retrieve callback examples from.
 */
export function getCallbackExamples(operation: OperationObject, definition: OASDocument): CallbackExample[] {
  if (!operation.callbacks) {
    return [];
  }

  const examples = Object.keys(operation.callbacks).map(identifier => {
    let callback = operation.callbacks?.[identifier];
    if (!callback) return [];
    if (isRef(callback)) {
      callback = dereferenceRef(callback, definition);
      if (!callback || isRef(callback)) return [];
    }

    const items = Object.keys(callback).map(expression => {
      let callbackPath = callback[expression];
      if (!callbackPath) return [];
      if (isRef(callbackPath)) {
        callbackPath = dereferenceRef(callbackPath, definition);
        if (!callbackPath || isRef(callbackPath)) return [];
      }

      return Object.keys(callbackPath).map(method => {
        if (['servers', 'parameters', 'summary', 'description'].includes(method)) {
          return false;
        }

        // This is a `PathItemObject` but `PathItemObject` extends `OperationObject` so this is
        // fine to force cast.
        const pathItem = callbackPath as Record<string, OperationObject>;
        const example = getResponseExamples(pathItem[method], definition);
        if (!example.length) return false;

        return {
          identifier,
          expression,
          method,
          example,
        };
      });
    });

    return items.flat().filter(item => item !== false);
  });

  return examples.flat();
}
