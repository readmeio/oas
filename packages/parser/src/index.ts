import type { ParserOptionsStrict, ParserOptions } from './options.js';
import type { Document } from './types.js';
import type $Refs from '@apidevtools/json-schema-ref-parser/dist/lib/refs';
import type { $RefsCallback, SchemaCallback } from '@apidevtools/json-schema-ref-parser/dist/lib/types';
import type { OpenAPI } from 'openapi-types';

import $RefParser from '@apidevtools/json-schema-ref-parser';
import _dereference from '@apidevtools/json-schema-ref-parser/dist/lib/dereference';
import { normalizeArgs } from '@apidevtools/json-schema-ref-parser/dist/lib/normalize-args';
import maybe from '@apidevtools/json-schema-ref-parser/dist/lib/util/maybe';
import { ono } from '@jsdevtools/ono';

import { isSwagger, isOpenAPI } from './lib/index.js';
import { getOptions } from './options.js';
import { fixOasRelativeServers } from './util.js';
import { validateSchema } from './validators/schema.js';
import { validateSpec } from './validators/spec.js';

const supported31Versions = ['3.1.0', '3.1.1'];
const supported30Versions = ['3.0.0', '3.0.1', '3.0.2', '3.0.3', '3.0.4'];
const supportedVersions = [...supported31Versions, ...supported30Versions];

export type { ParserOptions };

/**
 * This class parses a Swagger 2.0 or 3.0 OpenAPI API definition, resolves its JSON references and
 * their resolved values, and provides methods for traversing, dereferencing, and validating the
 * API.
 *
 * @class
 * @augments $RefParser
 */
export class OpenAPIParser<S extends Document = Document> extends $RefParser<S, ParserOptions> {
  /**
   * Parses the given Swagger API.
   *
   * This method does not resolve any JSON references, it just reads a single API definition in
   * JSON or YAML format, and parses it as a JS object.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [api] - The Swagger API object. This object will be used instead of reading from `path`.
   * @param {ParserOptions} [options] - ParserOptions that determine how the API is parsed
   * @param {Function} [callback] - An error-first callback. The second parameter is the parsed API object.
   * @returns {Promise} - The returned promise resolves with the parsed API object.
   */
  public override parse(api: S | string): Promise<S>;
  public override parse(api: S | string, callback: SchemaCallback): Promise<void>;
  public override parse(api: S | string, options: ParserOptions, callback: SchemaCallback<S>): Promise<void>;
  public override parse(
    path: string,
    api: S | string,
    options: ParserOptions,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public override parse(api: S | string, options: ParserOptions): Promise<S>;
  public override parse(path: string, api: S | string, options: ParserOptions): Promise<S>;
  override async parse() {
    const args = normalizeArgs<S>(arguments);
    args.options = getOptions(args.options);

    try {
      const schema = await super.parse(args.path, args.schema, args.options);
      if (!isSwagger(schema) && !isOpenAPI(schema)) {
        throw ono.syntax(`${args.path || args.schema} is not a valid API definition`);
      }

      if ('swagger' in schema && schema.swagger) {
        // Verify that the parsed object is a Swagger API
        if (schema.swagger === undefined || schema.info === undefined || schema.paths === undefined) {
          throw ono.syntax(`${args.path || 'Supplied schema'} is not a valid Swagger API definition.`);
        } else if (typeof schema.swagger === 'number') {
          throw ono.syntax('Swagger version number must be a string (e.g. "2.0") not a number.');
        } else if (typeof schema.info.version === 'number') {
          throw ono.syntax('API version number must be a string (e.g. "1.0.0") not a number.');
        } else if (schema.swagger !== '2.0') {
          throw ono.syntax(`Unrecognized Swagger version: ${schema.swagger}. Expected 2.0`);
        }
      } else {
        if (!isOpenAPI(schema)) {
          throw ono.syntax(`${args.path || 'Supplied schema'} is not a valid OpenAPI definition.`);
        }

        // Verify that the parsed object is a OpenAPI API definition.
        if (schema.openapi === undefined || schema.info === undefined) {
          throw ono.syntax(`${args.path || 'Supplied schema'} is not a valid OpenAPI definition.`);
        } else if (schema.paths === undefined) {
          // An OpenAPI 3.1 definition must have either `paths` or `webhooks`. If it has neither then
          // it's invalid.
          if (supported31Versions.includes(schema.openapi)) {
            if ('webhooks' in schema && schema.webhooks === undefined) {
              throw ono.syntax(`${args.path || 'Supplied schema'} is not a valid OpenAPI definition.`);
            }
          } else {
            throw ono.syntax(`${args.path || 'Supplied schema'} is not a valid OpenAPI definition.`);
          }
        } else if (typeof schema.openapi === 'number') {
          throw ono.syntax('OpenAPI version number must be a string (e.g. "3.0.0") not a number.');
        } else if (typeof schema.info.version === 'number') {
          throw ono.syntax('API version number must be a string (e.g. "1.0.0") not a number.');
        } else if (!supportedVersions.includes(schema.openapi)) {
          throw ono.syntax(
            `Unsupported OpenAPI version: ${schema.openapi}. This library only supports versions ${supportedVersions.join(', ')}`,
          );
        }

        // This is an OpenAPI v3 schema, check if the "servers" have any relative paths and
        // fix them if the content was pulled from a web resource
        fixOasRelativeServers(schema, args.path);
      }

      return maybe(args.callback, Promise.resolve(schema));
    } catch (err) {
      return maybe(args.callback, Promise.reject(err));
    }
  }

  /**
   * Parses, dereferences, and validates the given Swagger API.
   * Depending on the options, validation can include JSON Schema validation and/or Swagger Spec validation.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [api] - The Swagger API object. This object will be used instead of reading from `path`.
   * @param {ParserOptions} [options] - ParserOptions that determine how the API is parsed, dereferenced, and validated
   * @param {Function} [callback] - An error-first callback. The second parameter is the parsed API object.
   * @returns {Promise} - The returned promise resolves with the parsed API object.
   */
  public validate(api: S | string, callback: SchemaCallback<S>): Promise<void>;
  public validate(api: S | string, options: ParserOptions, callback: SchemaCallback<S>): Promise<void>;
  public validate(path: string, api: S | string, options: ParserOptions, callback: SchemaCallback<S>): Promise<void>;
  public validate(api: S | string): Promise<S>;
  public validate(api: S | string, options: ParserOptions): Promise<S>;
  public validate(path: string, api: S | string, options: ParserOptions): Promise<S>;
  async validate() {
    const args = normalizeArgs<S, ParserOptionsStrict>(arguments);
    args.options = getOptions(args.options);

    // ZSchema doesn't support circular objects, so don't dereference circular $refs yet
    // (see https://github.com/zaggino/z-schema/issues/137)
    const circular$RefOption = args.options.dereference.circular;
    if (args.options.validate.schema) {
      args.options.dereference.circular = 'ignore';
    }

    try {
      await this.dereference(args.path, args.schema, args.options);

      // Restore the original options, now that we're done dereferencing
      args.options.dereference.circular = circular$RefOption;

      if (args.options.validate.schema) {
        // Validate the API against the Swagger schema
        // NOTE: This is safe to do, because we haven't dereferenced circular $refs yet
        validateSchema(this.schema, {
          colorizeErrors: args.options.validate.colorizeErrors,
        });

        if (this.$refs?.circular) {
          if (circular$RefOption === true) {
            // The API has circular references,
            // so we need to do a second-pass to fully-dereference it
            _dereference<S>(this, args.options);
          } else if (circular$RefOption === false) {
            // The API has circular references, and they're not allowed, so throw an error
            throw ono.reference('The API contains circular references');
          }
        }
      }

      if (args.options.validate.spec) {
        // Validate the API against the Swagger spec
        validateSpec(this.schema!);
      }

      return maybe(args.callback, Promise.resolve(this.schema));
    } catch (err) {
      return maybe(args.callback, Promise.reject(err));
    }
  }

  public static validate<S extends Document = Document>(schema: OpenAPI.Document | string): Promise<S>;
  public static validate<S extends Document = Document>(
    schema: OpenAPI.Document | string,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static validate<S extends Document = Document>(
    schema: OpenAPI.Document | string,
    options: ParserOptions,
  ): Promise<S>;
  public static validate<S extends Document = Document>(
    schema: OpenAPI.Document | string,
    options: ParserOptions,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static validate<S extends Document = Document>(
    path: string,
    schema: OpenAPI.Document | string,
    options: ParserOptions,
  ): Promise<S>;
  public static validate<S extends Document = Document>(
    path: string,
    schema: OpenAPI.Document | string,
    options: ParserOptions,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  static validate<S extends Document = Document>(): Promise<S> | Promise<void> {
    const instance = new OpenAPIParser<S>();
    return instance.validate.apply(instance, arguments);
  }

  //
  //
  // The following methods are monkeypatchers for static methods in `json-schema-ref-parser`. If
  // we don't have these static overrides then our instance overrides that have custom behavior
  // won't be invoked because `json-schema-ref-parser` static methods instantiate a new instance
  // of `json-schema-ref-parser`, not our class.
  //
  //

  public static parse<S extends Document = Document>(schema: S | string | unknown): Promise<S>;
  public static parse<S extends Document = Document>(
    schema: S | string | unknown,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static parse<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static parse<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static parse<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static parse<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static parse<S extends Document = Document>(): Promise<S> | Promise<void> {
    const instance = new OpenAPIParser<S>();
    return instance.parse.apply(instance, arguments);
  }

  public static resolve<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
  ): Promise<$Refs<S, O>>;
  public static resolve<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    callback: $RefsCallback<S, O>,
  ): Promise<void>;
  public static resolve<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
  ): Promise<$Refs<S, O>>;
  public static resolve<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
    callback: $RefsCallback<S, O>,
  ): Promise<void>;
  public static resolve<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
  ): Promise<$Refs<S, O>>;
  public static resolve<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: $RefsCallback<S, O>,
  ): Promise<void>;
  static resolve<S extends Document = Document>(): Promise<S> | Promise<void> {
    const instance = new OpenAPIParser<S>();
    return instance.resolve.apply(instance, arguments);
  }

  public static bundle<S extends Document = Document>(schema: S | string | unknown): Promise<S>;
  public static bundle<S extends Document = Document>(
    schema: S | string | unknown,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static bundle<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static bundle<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static bundle<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static bundle<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<S>;
  static bundle<S extends Document = Document>(): Promise<S> | Promise<void> {
    const instance = new OpenAPIParser<S>();
    return instance.bundle.apply(instance, arguments);
  }

  public static dereference<S extends Document = Document>(schema: S | string | unknown): Promise<S>;
  public static dereference<S extends Document = Document>(
    schema: S | string | unknown,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static dereference<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static dereference<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  public static dereference<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
  ): Promise<S>;
  public static dereference<S extends Document = Document, O extends ParserOptions<S> = ParserOptions<S>>(
    path: string,
    schema: S | string | unknown,
    options: O,
    callback: SchemaCallback<S>,
  ): Promise<void>;
  static dereference<S extends Document = Document>(): Promise<S> | Promise<void> {
    const instance = new OpenAPIParser<S>();
    return instance.dereference.apply(instance, arguments);
  }
}
