import type { Options } from './lib/types.js';
import type { ParserOptions, ValidationResult } from '@readme/openapi-parser';
import type { OpenAPI, OpenAPIV2, OpenAPIV3 } from 'openapi-types';

import fs from 'node:fs';

import { bundle, compileErrors, dereference, validate } from '@readme/openapi-parser';
import postmanToOpenAPI from '@readme/postman-to-openapi';
import converter from 'swagger2openapi';

import { ValidationError } from './lib/errors.js';
import * as utils from './lib/utils.js';

export default class OASNormalize {
  cache: {
    bundle?: OpenAPI.Document | false;
    convert?: OpenAPI.Document | false;
    deref?: OpenAPI.Document | false;
    load?: Record<string, unknown> | false;
  };

  file: any;

  opts: Options;

  type: ReturnType<typeof utils.getType>;

  constructor(file: any, opts?: Options) {
    this.file = file;
    this.opts = {
      colorizeErrors: false,
      enablePaths: false,
      parser: {},
      ...opts,
    };

    if (!this.opts.enablePaths) {
      if (!this.opts.parser) this.opts.parser = {};
      if (!this.opts.parser.resolve) this.opts.parser.resolve = {};
      this.opts.parser.resolve = { file: false };
    }

    this.type = utils.getType(this.file);

    this.cache = {
      load: false,
      bundle: false,
      deref: false,
    };
  }

  /**
   * Load and return the API definition that `oas-normalize` was initialized with.
   *
   */
  async load(): Promise<Record<string, unknown>> {
    if (this.cache.load) return this.cache.load;

    const resolve = (obj: Parameters<typeof utils.stringToJSON>[0]) => {
      const ret = utils.stringToJSON(obj);
      this.cache.load = ret;
      return ret;
    };

    switch (this.type) {
      case 'json':
      case 'string-json':
      case 'string-yaml':
        return resolve(this.file);

      case 'buffer':
        return resolve(this.file.toString());

      case 'url':
        const { url, options } = utils.prepareURL(this.file);
        const resp = await fetch(url, options).then(res => res.text());
        return resolve(resp);

      case 'path':
        // Load a local file
        if (!this.opts.enablePaths) {
          throw new Error('Use `opts.enablePaths` to enable accessing local files.');
        }

        const contents = fs.readFileSync(this.file).toString();
        if (!contents.trim()) {
          throw new Error('No file contents found.');
        }
        return resolve(contents);

      default:
        throw new Error('Could not load this file.');
    }
  }

  private static async convertPostmanToOpenAPI(schema: any) {
    return postmanToOpenAPI(JSON.stringify(schema), undefined, { outputFormat: 'json', replaceVars: true }).then(
      JSON.parse,
    );
  }

  /**
   * Bundle up the given API definition, resolving any external `$ref` pointers in the process.
   *
   */
  async bundle(): Promise<OpenAPI.Document> {
    if (this.cache.bundle) return this.cache.bundle;
    const parserOptions = this.opts.parser || {};

    return this.load()
      .then(schema => {
        // Though Postman collections don't support `$ref` pointers for us to bundle we'll still
        // upconvert it to an OpenAPI definition file so our returned dataset is always one of
        // those for a Postman dataset.
        if (utils.isPostman(schema)) {
          return OASNormalize.convertPostmanToOpenAPI(schema);
        }

        return schema;
      })
      .then(schema => bundle(schema, parserOptions))
      .then(bundled => {
        this.cache.bundle = bundled;
        return bundled;
      });
  }

  /**
   * Dereference the given API definition.
   *
   */
  async dereference(): Promise<OpenAPI.Document> {
    if (this.cache.deref) return this.cache.deref;
    const parserOptions = this.opts.parser || {};

    return this.load()
      .then(schema => {
        // Though Postman collections don't support `$ref` pointers for us to dereference we'll
        // still upconvert it to an OpenAPI definition file so our returned dataset is always one
        // of those for a Postman dataset.
        if (utils.isPostman(schema)) {
          return OASNormalize.convertPostmanToOpenAPI(schema);
        }

        return schema;
      })
      .then(schema => dereference(schema, parserOptions))
      .then(dereferenced => {
        this.cache.deref = dereferenced;
        return dereferenced;
      });
  }

  /**
   * Dereference the given API definition.
   *
   * This method is deprecated in favor of `dereference`. It will be removed in a future release.
   *
   * @deprecated
   */
  async deref(): Promise<OpenAPI.Document> {
    return this.dereference();
  }

  /**
   * Convert a given API definition to OpenAPI if it is not already.
   *
   */
  async convert(): Promise<OpenAPI.Document> {
    if (this.cache.convert) return this.cache.convert;

    return this.load()
      .then(async schema => {
        // If we have a Postman collection we need to convert it to OpenAPI.
        return utils.isPostman(schema) ? OASNormalize.convertPostmanToOpenAPI(schema) : schema;
      })
      .then(async schema => {
        if (!utils.isSwagger(schema) && !utils.isOpenAPI(schema)) {
          throw new Error('The supplied API definition is unsupported.');
        } else if (utils.isOpenAPI(schema)) {
          return schema;
        }

        const baseVersion = parseInt(schema.swagger, 10);
        if (baseVersion === 1) {
          throw new Error('Swagger v1.2 is unsupported.');
        }

        return converter
          .convertObj(schema, { anchors: true })
          .then((options: { openapi: OpenAPI.Document }) => options.openapi);
      });
  }

  /**
   * Validate a given API definition.
   *
   * If supplied a Postman collection it will be converted to OpenAPI first and then run through
   * standard OpenAPI validation.
   *
   */
  async validate(
    opts: {
      /**
       * Options to supply to our OpenAPI parser. See `@readme/openapi-parser` for documentation.
       * This option is deprecated in favor of the `parser` option on the constructor. It will be
       * removed in a future release.
       *
       * @see {@link https://npm.im/@readme/openapi-parser}
       * @deprecated
       */
      parser?: ParserOptions;
    } = {},
  ): Promise<ValidationResult> {
    const parserOptions = opts.parser || this.opts.parser || {};
    if (!parserOptions.validate) parserOptions.validate = {};
    if (!parserOptions.validate.errors) parserOptions.validate.errors = {};

    parserOptions.validate.errors.colorize = this.opts.colorizeErrors;

    return this.load()
      .then(async schema => {
        // Because we don't have something akin to `openapi-parser` for Postman collections we just
        // always convert them to OpenAPI.
        return utils.isPostman(schema) ? OASNormalize.convertPostmanToOpenAPI(schema) : schema;
      })
      .then(async schema => {
        if (!utils.isSwagger(schema) && !utils.isOpenAPI(schema)) {
          throw new ValidationError('The supplied API definition is unsupported.');
        } else if (utils.isSwagger(schema)) {
          const baseVersion = parseInt(schema.swagger, 10);
          if (baseVersion === 1) {
            throw new ValidationError('Swagger v1.2 is unsupported.');
          }
        }

        /**
         * `OpenAPIParser.validate()` dereferences schemas at the same time as validation, mutating
         * the supplied parameter in the process, and does not give us an option to disable this.
         * As we already have a dereferencing method on this library, and this method just needs to
         * tell us if the API definition is valid or not, we need to clone the schema before
         * supplying it to `openapi-parser`.
         */
        // eslint-disable-next-line try-catch-failsafe/json-parse
        const clonedSchema = JSON.parse(JSON.stringify(schema));

        const result = await validate(clonedSchema, parserOptions);
        if (!result.valid) {
          throw new ValidationError(compileErrors(result));
        }

        // The API definition, whatever its format or specification, is valid.
        return result;
      });
  }

  /**
   * Retrieve OpenAPI, Swagger, or Postman version information about the supplied API definition.
   *
   */
  async version(): Promise<{ specification: 'openapi' | 'postman' | 'swagger'; version: string | 'unknown' }> {
    return this.load().then(schema => {
      switch (utils.getAPIDefinitionType(schema)) {
        case 'openapi':
          return {
            specification: 'openapi',
            version: (schema as unknown as OpenAPIV3.Document).openapi,
          };

        case 'postman':
          let version = 'unknown';
          if ((schema?.info as Record<string, string>)?.schema) {
            // Though `info.schema` is required by the Postman spec there's no strictness to its
            // contents so we'll do our best to extract a version out of this schema URL that they
            // seem to usually match. If not we'll fallback to treating it as an `unknown` version.
            const match = (schema?.info as Record<string, string>).schema.match(
              /http(s?):\/\/schema.getpostman.com\/json\/collection\/v([0-9.]+)\//,
            );

            if (match) {
              version = match[2];
            }
          }

          return {
            specification: 'postman',
            version,
          };

        case 'swagger':
          return {
            specification: 'swagger',
            version: (schema as unknown as OpenAPIV2.Document).swagger,
          };

        default:
          throw new Error('Unknown file detected.');
      }
    });
  }
}
