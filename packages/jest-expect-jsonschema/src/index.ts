import type { MatcherState } from '@vitest/expect';
import type { Options, SchemaObject } from 'ajv/dist/2020';

import AjvDraft4 from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import Ajv2020 from 'ajv/dist/2020';

declare global {
  // oxlint-disable-next-line typescript/no-namespace -- This is how you type Jest matchers.
  namespace jest {
    interface Matchers<R> {
      /**
       * Assert that a given JSON Schema object is valid against the `$schema` version it
       * identifies itself as.
       *
       * @param schema The JSON Schema object to validate.
       */
      toBeValidJSONSchema(): Promise<R>;

      /**
       * Assert that a given array of JSON Schema objects is valid against the `$schema` version
       * that they each identify themselves as.
       *
       * @param schemas The array of JSON Schema objects to validate.
       */
      toBeValidJSONSchemas(): Promise<R>;
    }
  }
}

function getAJVForSchema(schema: SchemaObject) {
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

  return ajv;
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
): Promise<{
  message: () => string;
  pass: boolean;
}> {
  const { matcherHint, printExpected, printReceived } = this.utils;

  const ajv = getAJVForSchema(schema);
  const valid = Boolean(await ajv.validateSchema(schema));

  return {
    pass: valid,
    message: () => {
      return `${matcherHint(valid ? '.not.toBeValidJSONSchema' : '.toBeValidJSONSchema')}\n\n${printExpected(schema)}\n\n${printReceived(ajv.errors)}`;
    },
  };
}

/**
 * Assert that a given array of JSON Schema objects is valid against the `$schema` version that
 * they each identify themselves as.
 *
 * @param schemas The array of JSON Schema objects to validate.
 */
export async function toBeValidJSONSchemas(
  this: jest.MatcherUtils | MatcherState,
  schemas: SchemaObject[],
): Promise<{
  message: () => string;
  pass: boolean;
}> {
  const { matcherHint, printExpected, printReceived } = this.utils;

  if (!Array.isArray(schemas)) {
    return {
      pass: false,
      message: () =>
        `${matcherHint('.toBeValidJSONSchemas')}\n\n` +
        'Expected an array of JSON Schema objects.\n\n' +
        `${printReceived(schemas)}`,
    };
  }

  const results = await Promise.all(
    schemas.map(async (schema, i) => {
      const ajv = getAJVForSchema(schema);
      const valid = Boolean(await ajv.validateSchema(schema));

      return valid ? null : { index: i, schema, errors: ajv.errors };
    }),
  );

  const failures = results.filter((r): r is NonNullable<typeof r> => r !== null);
  const pass = !failures.length;

  return {
    pass,
    message: () => {
      const hint = `${matcherHint(pass ? '.not.toBeValidJSONSchemas' : '.toBeValidJSONSchemas')}\n\n`;
      if (pass) {
        return `${hint}Expected array to have no valid schemas:\n\n${printExpected(schemas)}`;
      }

      const failureDetails = failures
        .map(f => `Schema #${f.index + 1}:\n\n${printExpected(f.schema)}\n\n${printReceived(f.errors)}`)
        .join('\n\n');

      return `${hint}Expected all JSON Schema objects to be valid. ${failures.length} schema(s) failed:\n\n${failureDetails}`;
    },
  };
}
