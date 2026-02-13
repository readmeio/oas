import type { OperationObject } from '../../types.js';
import type { ResponseExample } from './get-response-examples.js';

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
export function getCallbackExamples(operation: OperationObject): CallbackExample[] {
  if (!operation.callbacks) {
    return [];
  }

  const examples = Object.keys(operation.callbacks).map(identifier => {
    const callback = operation.callbacks?.[identifier];
    if (!callback || isRef(callback)) {
      /** @todo add support for `ReferenceObject */
      return [];
    }

    const items = Object.keys(callback).map(expression => {
      return Object.keys(callback[expression]).map(method => {
        const pathItem = callback[expression] as Record<string, OperationObject>;
        const example = getResponseExamples(pathItem[method]);
        if (example.length === 0) return false;

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
