import type { ErrorObject } from 'ajv/dist/2020';

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
 */
export function reduceAjvErrors(errors: ErrorObject[]) {
  const flattened = new Map();

  errors.forEach(err => {
    // These two errors appear when a child schema of them has a problem and instead of polluting
    // the user with indecipherable noise we should instead relay the more specific error to them.
    // If this is all that's present in the stack then as a safety net before we wrap up we'll just
    // return the original `errors` stack.
    if (["must have required property '$ref'", 'must match exactly one schema in oneOf'].includes(err.message)) {
      return;
    }

    // If this is our first run through let's initialize our dataset and move along.
    if (!flattened.size) {
      flattened.set(err.instancePath, err);
      return;
    } else if (flattened.has(err.instancePath)) {
      // If we already have an error recorded for this `instancePath` we can ignore it because we
      // (likely) already have recorded the more specific error.
      return;
    }

    // If this error hasn't already been recorded, maybe it's an error against the same
    // `instancePath` stack, in which case we should ignore it because the more specific error has
    // already been recorded.
    let shouldRecordError = true;
    flattened.forEach(flat => {
      if (flat.instancePath.includes(err.instancePath)) {
        shouldRecordError = false;
      }
    });

    if (shouldRecordError) {
      flattened.set(err.instancePath, err);
    }
  });

  // If we weren't able to fold errors down for whatever reason just return the original stack.
  if (!flattened.size) {
    return errors;
  }

  return [...flattened.values()];
}
