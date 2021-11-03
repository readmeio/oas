import * as RMOAS from '../rmoas.types';
import getResponseExamples from './get-response-examples';

export type CallbackExamples = {
  identifier: string;
  expression: string;
  method: string;
  example: unknown;
}[];

/**
 * With an OpenAPI Operation Object return back an array of examples for any callbacks that may be present.
 *
 * @param operation Operation to retrieve callback examples from.
 * @returns An an array of callback examples.
 */
export default function getCallbackExamples(operation: RMOAS.OperationObject) {
  // spreads the contents of the map for each callback so there's not nested arrays returned
  return [].concat(
    ...Object.keys(operation.callbacks || {}).map(identifier => {
      const callback = operation.callbacks[identifier] as RMOAS.CallbackObject;

      // spreads the contents again so there's not nested arrays returned
      return []
        .concat(
          ...Object.keys(callback).map(expression => {
            return Object.keys(callback[expression]).map(method => {
              const pathItem = callback[expression] as Record<string, RMOAS.OperationObject>;
              const example = getResponseExamples(pathItem[method]);
              if (example.length === 0) return false;

              return {
                identifier,
                expression,
                method,
                example,
              };
            });
          })
        )
        .filter(Boolean);
    })
  ) as CallbackExamples;
}
