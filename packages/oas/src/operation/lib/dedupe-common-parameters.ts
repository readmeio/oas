import type { ParameterObject } from '../../types.js';

import { isRef } from '../../types.js';

/**
 * With an array of common parameters filter down them to what isn't already present in a list of
 * non-common parameters.
 *
 * @param parameters Array of parameters defined at the operation level.
 * @param commonParameters Array of **common** parameters defined at the path item level.
 */
export function dedupeCommonParameters(
  parameters: ParameterObject[],
  commonParameters: ParameterObject[],
): ParameterObject[] {
  return commonParameters.filter((param: ParameterObject) => {
    return !parameters.find((param2: ParameterObject) => {
      if (param.name && param2.name) {
        return param.name === param2.name && param.in === param2.in;
      } else if (isRef(param) && isRef(param2)) {
        return param.$ref === param2.$ref;
      }

      return false;
    });
  });
}
