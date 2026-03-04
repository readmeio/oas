import type { MatcherState, SyncExpectationResult } from '@vitest/expect';

import Ajv2020, { type Options } from 'ajv/dist/2020';
import AjvDraft4 from 'ajv-draft-04';
import addFormats from 'ajv-formats';

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Assert that a given JSON Schema object is valid against the `$schema` version it
       * identifies itself as.
       *
       * @param schema The JSON Schema object to validate.
       */
      toBeValidJSONSchema(): Promise<R>;
    }
  }
}

/**
 * Assert that a given JSON Schema object is valid against the `$schema` version it identifies
 * itself as.
 *
 * @param schema The JSON Schema object to validate.
 */
export async function toBeValidJSONSchema(
  this: jest.MatcherUtils | MatcherState,
  schema: Record<string, unknown>,
): Promise<{ message: () => string; pass: boolean }> {
  const { matcherHint, printReceived } = this.utils;
  const message: (
    pass: boolean,
    error: unknown,
  ) => jest.CustomMatcherResult['message'] | SyncExpectationResult['message'] = (pass, error) => () => {
    return (
      `${matcherHint(pass ? '.not.toBeValidJSONSchema' : '.toBeValidJSONSchema')}\n\n` +
      'Expected JSON Schema object to be valid.\n\n' +
      `${printReceived(error)}`
    );
  };

  const ajvOptions: Options = {
    strict: true,
    validateSchema: true,
    allErrors: true,
  };

  let ajv: Ajv2020 | AjvDraft4;
  if (
    '$schema' in schema &&
    typeof schema?.$schema === 'string' &&
    schema?.$schema.startsWith('https://json-schema.org/draft/2020-12')
  ) {
    ajv = new Ajv2020(ajvOptions);
  } else {
    ajv = new AjvDraft4(ajvOptions);
  }

  // `strict` mode flags `x-readme-ref-name` as an unknown keyword
  ajv.addKeyword({
    keyword: 'x-readme-ref-name',
    schemaType: 'string',
  });

  // AJV by default doesn't understand formats like `int64`.
  addFormats(ajv);

  const valid = Boolean(await ajv.validateSchema(schema));

  return {
    pass: valid,
    message: message(valid, ajv.errors),
  };
}
