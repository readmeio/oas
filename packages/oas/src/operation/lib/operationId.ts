import type { OperationObject } from '../../types';

/**
 * Determine if an operation has an `operationId` present in its schema. Note that if one is
 * present in the schema but is an empty string then this will return false.
 *
 */
export function hasOperationId(operation: OperationObject): boolean {
  return Boolean('operationId' in operation && operation.operationId.length);
}

/**
 * Get an `operationId` for an operation. If one is not present (it's not required by the spec!)
 * a hash of the path and method will be returned instead.
 *
 */
export function getOperationId(
  path: string,
  method: string,
  operation: OperationObject,
  opts: {
    /**
     * Generate a JS method-friendly operation ID when one isn't present.
     *
     * For backwards compatiblity reasons this option will be indefinitely supported however we
     * recommend using `friendlyCase` instead as it's a heavily improved version of this option.
     *
     * @see {opts.friendlyCase}
     * @deprecated
     */
    camelCase?: boolean;

    /**
     * Generate a human-friendly, but still camelCase, operation ID when one isn't present. The
     * difference between this and `camelCase` is that this also ensure that consecutive words are
     * not present in the resulting ID. For example, for the endpoint `/candidate/{candidate}` will
     * return `getCandidateCandidate` for `camelCase` however `friendlyCase` will return
     * `getCandidate`.
     *
     * The reason this friendliness is just not a part of the `camelCase` option is because we have
     * a number of consumers of the old operation ID style and making that change there would a
     * breaking change that we don't have any easy way to resolve.
     */
    friendlyCase?: boolean;
  } = {},
): string {
  function sanitize(id: string) {
    // We aren't sanitizing underscores here by default in order to preserve operation IDs that
    // were already generated with this method in the past.
    return id
      .replace(opts?.camelCase || opts?.friendlyCase ? /[^a-zA-Z0-9_]/g : /[^a-zA-Z0-9]/g, '-') // Remove weird characters
      .replace(/--+/g, '-') // Remove double --'s
      .replace(/^-|-$/g, ''); // Don't start or end with -
  }

  const operationIdExists = hasOperationId(operation);
  let operationId: string;
  if (operationIdExists) {
    operationId = operation.operationId;
  } else {
    operationId = sanitize(path).toLowerCase();
  }

  const currMethod = method.toLowerCase();
  if (opts?.camelCase || opts?.friendlyCase) {
    if (opts?.friendlyCase) {
      // In order to generate friendlier operation IDs we should swap out underscores with spaces
      // so the end result will be _slightly_ more camelCase.
      operationId = operationId.replaceAll('_', ' ');

      if (!operationIdExists) {
        // In another effort to generate friendly operation IDs we should prevent words from
        // appearing in consecutive order (eg. `/candidate/{candidate}` should generate
        // `getCandidate` not `getCandidateCandidate`). However we only want to do this if we're
        // generating the operation ID as if they intentionally added a consecutive word into the
        // operation ID then we should respect that.
        operationId = operationId
          .replace(/[^a-zA-Z0-9_]+(.)/g, (_, chr) => ` ${chr}`)
          .split(' ')
          .filter((word, i, arr) => word !== arr[i - 1])
          .join(' ');
      }
    }

    operationId = operationId.replace(/[^a-zA-Z0-9_]+(.)/g, (_, chr) => chr.toUpperCase());
    if (operationIdExists) {
      operationId = sanitize(operationId);
    }

    // Never start with a number.
    operationId = operationId.replace(/^[0-9]/g, match => `_${match}`);

    // Ensure that the first character of an `operationId` is always lowercase.
    operationId = operationId.charAt(0).toLowerCase() + operationId.slice(1);

    // If the generated `operationId` already starts with the method (eg. `getPets`) we don't want
    // to double it up into `getGetPets`.
    if (operationId.startsWith(currMethod)) {
      return operationId;
    }

    // If this operation already has an `operationId` and we just cleaned it up then we shouldn't
    // prefix it with an HTTP method.
    if (operationIdExists) {
      return operationId;
    }

    // Because we're merging the `operationId` into an HTTP method we need to reset the first
    // character of it back to lowercase so we end up with `getBuster`, not `getbuster`.
    operationId = operationId.charAt(0).toUpperCase() + operationId.slice(1);
    return `${currMethod}${operationId}`;
  } else if (operationIdExists) {
    return operationId;
  }

  return `${currMethod}_${operationId}`;
}
