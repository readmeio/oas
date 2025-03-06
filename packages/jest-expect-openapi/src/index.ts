import type { MatcherState, SyncExpectationResult } from '@vitest/expect';

import { compileErrors, validate } from '@readme/openapi-parser';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /**
       * Assert that a given OpenAPI definition is valid.
       *
       * @param transformer If you need to downgrade the given spec to test different usecase you
       *    can pass a transformer function. It takes a single argument, `spec`, that you should
       *    return.
       */
      toBeAValidOpenAPIDefinition(transformer?: (spec: Record<string, unknown>) => Record<string, unknown>): Promise<R>;
    }
  }
}

/**
 * Assert that a given OpenAPI definition is valid.
 *
 * @param definition
 * @param transformer If you need to transform the given spec to test different usecase you can
 * pass a transformer function. It takes a single argument, `spec`, that you should return.
 */
export default async function toBeAValidOpenAPIDefinition(
  this: jest.MatcherUtils | MatcherState,
  definition: Record<string, unknown>,
  transformer?: (spec: Record<string, unknown>) => Record<string, unknown>,
): Promise<{ message: () => string; pass: boolean }> {
  const { matcherHint, printReceived } = this.utils;
  const message: (
    pass: boolean,
    error: unknown,
  ) => jest.CustomMatcherResult['message'] | SyncExpectationResult['message'] = (pass, error) => () => {
    return (
      `${matcherHint(pass ? '.not.toBeAValidOpenAPIDefinition' : '.toBeAValidOpenAPIDefinition')}\n\n` +
      'Expected OpenAPI definition to be valid.\n\n' +
      `${printReceived(error)}`
    );
  };

  // eslint-disable-next-line try-catch-failsafe/json-parse
  let cloned = JSON.parse(JSON.stringify(definition));
  if (transformer) {
    cloned = transformer(cloned);
  }

  const { pass, error } = await validate(cloned)
    .then(res => {
      if (res.valid) {
        return { pass: true, error: null };
      }

      return { pass: false, error: compileErrors(res) };
    })
    .catch((err: Error) => ({ pass: false, error: err.message }));

  return {
    pass,
    message: message(pass, error),
  };
}
