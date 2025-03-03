import type { APIDocument, ParserOptions, ValidationResult, ErrorDetails, WarningDetails } from './types.js';

import $RefParser, { dereferenceInternal, MissingPointerError } from '@apidevtools/json-schema-ref-parser';

import { ValidationError } from './errors.js';
import { isSwagger, isOpenAPI } from './lib/index.js';
import { convertOptionsForParser, normalizeArguments, repairSchema } from './util.js';
import { validateSchema } from './validators/schema.js';
import { validateSpec } from './validators/spec.js';

export type { ParserOptions, ValidationResult, ErrorDetails, WarningDetails };
export { ValidationError } from './errors.js';

/**
 * Parses the given API definition, in JSON or YAML format, and returns it as a JSON object. This
 * method **does not** resolve `$ref` pointers or dereference anything. It simply parses _one_ file
 * and returns it.
 *
 * @param api - A file path or URL to a JSON Schema object, or the JSON Schema object itself.
 * @param options
 */
export async function parse<S extends APIDocument = APIDocument>(api: S | string, options?: ParserOptions): Promise<S> {
  const args = normalizeArguments<S>(api);
  const parserOptions = convertOptionsForParser(options);

  const parser = new $RefParser<S>();
  const schema = await parser.parse(args.path, args.schema, parserOptions);

  // If necessary, repair the schema of any anomalies and quirks.
  repairSchema(schema, args.path);

  return schema;
}

/**
 * Bundles all referenced files and URLs into a single API definition that only has _internal_
 * `$ref` pointers. This lets you split up your definition however you want while you're building
 * it, but later combine all those files together when it's time to package or distribute the API
 * definition to other people. The resulting definition size will be small, since it will still
 * contain _internal_ JSON references rather than being fully-dereferenced.
 *
 * @param api - A file path or URL to a JSON Schema object, or the JSON Schema object itself.
 * @param options
 */
export async function bundle<S extends APIDocument = APIDocument>(
  api: S | string,
  options?: ParserOptions,
): Promise<S> {
  const args = normalizeArguments<S>(api);
  const parserOptions = convertOptionsForParser(options);

  const parser = new $RefParser<S>();
  await parser.bundle(args.path, args.schema, parserOptions);

  // If necessary, repair the schema of any anomalies and quirks.
  repairSchema(parser.schema, args.path);

  return parser.schema;
}

/**
 * Dereferences all `$ref` pointers in the supplied API definition, replacing each reference with
 * its resolved value. This results in an API definition that does not contain _any_ `$ref`
 * pointers. Instead, it's a normal JSON object tree that can easily be crawled and used just like
 * any other object. This is great for programmatic usage, especially when using tools that don't
 * understand JSON references.
 *
 * @param api - A file path or URL to a JSON Schema object, or the JSON Schema object itself.
 * @param options
 */
export async function dereference<S extends APIDocument = APIDocument>(
  api: S | string,
  options?: ParserOptions,
): Promise<S> {
  const args = normalizeArguments<S>(api);
  const parserOptions = convertOptionsForParser(options);

  const parser = new $RefParser<S>();
  await parser.dereference(args.path, args.schema, parserOptions);

  // If necessary, repair the schema of any anomalies and quirks.
  repairSchema(parser.schema, args.path);

  return parser.schema;
}

/**
 * Validates the API definition against the Swagger 2.0, OpenAPI 3.0, or OpenAPI 3.1 specifications.
 *
 * In addition to validating the API definition against their respective specification schemas it
 * will also be validated against specific areas that aren't covered by the Swagger or OpenAPI
 * schemas, such as duplicate parameters, invalid component schema names, or duplicate
 * `operationId` values.
 *
 * If validation fails an error will be thrown with information about what, and where, the error
 * lies within the API definition.
 *
 * Internally this method invokes [`dereference()`](#dereference) so the returned object, whether
 * its a Swagger or OpenAPI definition, will be fully dereferenced.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v2.0}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.0}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.1}
 * @param api - A file path or URL to a JSON Schema object, or the JSON Schema object itself.
 * @param options
 */
export async function validate<S extends APIDocument, Options extends ParserOptions>(
  api: S | string,
  options?: Options,
): Promise<ValidationResult> {
  const args = normalizeArguments<S>(api);
  const parserOptions = convertOptionsForParser(options);

  let result: ValidationResult;

  // ZSchema doesn't support circular objects, so don't dereference circular $refs yet
  // (see https://github.com/zaggino/z-schema/issues/137)
  const circular$RefOption = parserOptions.dereference.circular;
  parserOptions.dereference.circular = 'ignore';

  const parser = new $RefParser<S>();
  try {
    await parser.dereference(args.path, args.schema, parserOptions);
  } catch (err) {
    // `json-schema-ref-parser` will throw exceptions on things like `$ref` pointers that can't
    // be resolved so we need to capture and reformat those into our expected `ValidationResult`
    // format.
    if (err instanceof MissingPointerError) {
      return {
        valid: false,
        errors: [{ message: err.message }],
        warnings: [],
        additionalErrors: 0,
        specification: 'Unknown',
      };
    }

    throw err;
  }

  if (!isSwagger(parser.schema) && !isOpenAPI(parser.schema)) {
    throw new ValidationError('Supplied schema is not a valid API definition.');
  }

  // Restore the original options, now that we're done dereferencing
  parserOptions.dereference.circular = circular$RefOption;

  // Validate the API against the OpenAPI or Swagger JSON schema definition.
  // NOTE: This is safe to do, because we haven't dereferenced circular $refs yet
  result = validateSchema(parser.schema, options);
  if (!result.valid) {
    return result;
  }

  if (parser.$refs?.circular) {
    if (circular$RefOption === true) {
      // The API has circular reference so we need to do a second pass to fully dereference it.
      dereferenceInternal<S>(parser, parserOptions);
    } else if (circular$RefOption === false) {
      // The API has circular references but we're configured to not permit that.
      throw new ReferenceError(
        'The API contains circular references but the validator is configured to not permit them.',
      );
    }
  }

  // Validate the API against the OpenAPI or Swagger specification.
  const rules = options?.validate?.rules?.openapi;
  result = validateSpec(parser.schema, {
    openapi: {
      'array-without-items': rules?.['array-without-items'] || 'error',
      'duplicate-non-request-body-parameters': rules?.['duplicate-non-request-body-parameters'] || 'error',
      'duplicate-operation-id': rules?.['duplicate-operation-id'] || 'error',
      'non-optional-path-parameters': rules?.['non-optional-path-parameters'] || 'error',
      'path-parameters-not-in-parameters': rules?.['path-parameters-not-in-parameters'] || 'error',
      'path-parameters-not-in-path': rules?.['path-parameters-not-in-path'] || 'error',
    },
  });

  // If necessary, repair the schema of any anomalies and quirks.
  // repairSchema(parser.schema, args.path);

  return result;
}

/**
 * A utility to transform the `ValidationResult` from a `validate()` call to a human-readable
 * string.
 *
 */
export function compileErrors(result: ValidationResult): string {
  const specName = result.specification === 'Unknown' ? 'API definition' : result.specification;
  let message = `${specName} schema validation failed.\n`;
  message += '\n';

  if (result.valid === false) {
    if (result.errors.length) {
      message += result.errors.map(err => err.message).join('\n\n');
    }
  }

  if (result.warnings.length) {
    if (result.valid === false && result.errors.length) {
      message += '\n\nWe have also found some additional warnings:\n\n';
    }

    message += result.warnings.map(warn => warn.message).join('\n\n');
  }

  if (result.valid === false && result.additionalErrors > 0) {
    message += `\n\nPlus an additional ${result.additionalErrors} errors. Please resolve the above and re-run validation to see more.`;
  }

  return message;
}
