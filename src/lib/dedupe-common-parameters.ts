import * as RMOAS from '../rmoas.types';

/**
 * With an array of common parameters filter down them to what isn't already present in a list of
 * non-common parameters.
 *
 * @param parameters Array of parameters defined at the operation level.
 * @param commonParameters Array of **common** parameters defined at the path item level.
 */
export default function dedupeCommonParameters(
  parameters: RMOAS.ParameterObject[],
  commonParameters: RMOAS.ParameterObject[],
) {
  return commonParameters.filter((param: RMOAS.ParameterObject) => {
    return !parameters.find((param2: RMOAS.ParameterObject) => {
      if (param.name && param2.name) {
        return param.name === param2.name && param.in === param2.in;
      } else if (RMOAS.isRef(param) && RMOAS.isRef(param2)) {
        return param.$ref === param2.$ref;
      }

      return false;
    });
  });
}
