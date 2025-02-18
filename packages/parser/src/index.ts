import type { APIDocument, ParserOptions } from './types.js';

import $RefParser from '@apidevtools/json-schema-ref-parser';
import _dereference from '@apidevtools/json-schema-ref-parser/dist/lib/dereference';
import { ono } from '@jsdevtools/ono';

import { isSwagger, isOpenAPI } from './lib/index.js';
import { convertOptionsForParser, normalizeArguments, repairSchema } from './util.js';
import { validateSchema } from './validators/schema.js';
import { validateSpec } from './validators/spec.js';

export type { ParserOptions };

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
export async function validate<S extends APIDocument = APIDocument>(
  api: S | string,
  options?: ParserOptions,
): Promise<S> {
  const args = normalizeArguments<S>(api);
  const parserOptions = convertOptionsForParser(options);

  // ZSchema doesn't support circular objects, so don't dereference circular $refs yet
  // (see https://github.com/zaggino/z-schema/issues/137)
  const circular$RefOption = parserOptions.dereference.circular;
  parserOptions.dereference.circular = 'ignore';

  const parser = new $RefParser<S>();
  await parser.dereference(args.path, args.schema, parserOptions);

  if (!isSwagger(parser.schema) && !isOpenAPI(parser.schema)) {
    throw ono.syntax('Supplied schema is not a valid API definition.');
  }

  // Restore the original options, now that we're done dereferencing
  parserOptions.dereference.circular = circular$RefOption;

  // Validate the API against the OpenAPI or Swagger JSON schema definition.
  // NOTE: This is safe to do, because we haven't dereferenced circular $refs yet
  validateSchema(parser.schema, {
    colorizeErrors: options?.validate && 'colorizeErrors' in options.validate ? options.validate.colorizeErrors : false,
  });

  if (parser.$refs?.circular) {
    if (circular$RefOption === true) {
      // The API has circular reference so we need to do a second pass to fully dereference it.
      _dereference<S>(parser, parserOptions);
    } else if (circular$RefOption === false) {
      // The API has circular references but we're configured to not permit that.
      throw ono.reference('The API contains circular references');
    }
  }

  // Validate the API against the OpenAPI or Swagger specification.
  validateSpec(parser.schema);

  // If necessary, repair the schema of any anomalies and quirks.
  repairSchema(parser.schema, args.path);

  return parser.schema;
}
