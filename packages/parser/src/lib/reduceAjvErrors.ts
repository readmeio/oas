import type { ErrorObject } from 'ajv';

/**
 * Because of the way that Ajv works, if a validation error occurs deep within a schema there's a
 * chance that errors will also be thrown for its immediate parents, leading to a case where we'll
 * eventually show the error indecipherable errors like "$ref is missing here!" instance of what's
 * _actually_ going on where they may have mistyped `enum` as `enumm`.
 *
 * To alleviate this confusing noise, we're compressing Ajv errors down to only surface the deepest
 * point for each lineage, so that if a user typos `enum` as `enumm` we'll surface just that error
 * for them (because really that's **the** error).
 *
 * Ajv reports the deepest error of a lineage first, so an error is dropped when an error was
 * already recorded for the same `instancePath` or for one of its descendants. Every recorded
 * `instancePath` marks itself and its ancestors as covered, which keeps this linear in the number
 * of errors (large API definitions can produce hundreds of thousands of them).
 *
 */
export function reduceAjvErrors(errors: ErrorObject[]): ErrorObject[] {
  const flattened = new Map<string, ErrorObject>();
  const covered = new Set<string>();

  errors.forEach(err => {
    // These two errors appear when a child schema of them has a problem and instead of polluting
    // the user with indecipherable noise we should instead relay the more specific error to them.
    // If this is all that's present in the stack then as a safety net before we wrap up we'll just
    // return the original `errors` stack.
    if (["must have required property '$ref'", 'must match exactly one schema in oneOf'].includes(err.message)) {
      return;
    }

    // If we already have an error recorded for this `instancePath`, or for one of its descendants,
    // we can ignore it because we (likely) already have recorded the more specific error.
    if (covered.has(err.instancePath)) {
      return;
    }

    flattened.set(err.instancePath, err);

    let instancePath = err.instancePath;
    covered.add(instancePath);
    while (instancePath) {
      instancePath = instancePath.slice(0, instancePath.lastIndexOf('/'));
      covered.add(instancePath);
    }
  });

  // If we weren't able to fold errors down for whatever reason just return the original stack.
  if (!flattened.size) {
    return errors;
  }

  return [...flattened.values()];
}
