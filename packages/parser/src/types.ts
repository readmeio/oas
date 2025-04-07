import type { JSONSchema4Object, JSONSchema6Object, JSONSchema7Object } from 'json-schema';
import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

export type APIDocument<T extends object = NonNullable<unknown>> =
  | OpenAPIV2.Document<T>
  | OpenAPIV3_1.Document<T>
  | OpenAPIV3.Document<T>;

type JSONSchemaObject = JSONSchema4Object | JSONSchema6Object | JSONSchema7Object;

export interface ErrorDetails {
  message: string;
}

export interface WarningDetails {
  message: string;
}

export type ValidationResult =
  | {
      valid: false;
      errors: ErrorDetails[];
      warnings: WarningDetails[];
      additionalErrors: number;
      specification: 'OpenAPI' | 'Swagger' | null;
    }
  | {
      valid: true;
      warnings: WarningDetails[];
      specification: 'OpenAPI' | 'Swagger' | null;
    };

export interface ParserRulesOpenAPI extends Record<string, 'error' | 'warning'> {
  /**
   * Schemas that are defined as `type: array` must also have an `items` schema. The default
   * is `error`.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.4.md#json-schema-keywords}
   */
  'array-without-items': 'error' | 'warning';

  /**
   * Parameters must be unique. The default is `error`.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#user-content-operationparameters}
   */
  'duplicate-non-request-body-parameters': 'error' | 'warning';

  /**
   * The `operationId` definition in a path object must be unique. The default is `error`.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#user-content-operationid}
   */
  'duplicate-operation-id': 'error' | 'warning';

  /**
   * Parameters that are defined within the path URI must be specified as being `required`. The
   * default is `error`.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#user-content-operationparameters}
   */
  'non-optional-path-parameters': 'error' | 'warning';

  /**
   * Path parameters defined in a path URI path template must also be specified as part of that
   * paths `parameters`. The default is `error`.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-templating}
   */
  'path-parameters-not-in-parameters': 'error' | 'warning';

  /**
   * Path parameters defined in `parameters` must also be specified in the path URI with
   * path templating. The default is `error`.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#user-content-parametername}
   */
  'path-parameters-not-in-path': 'error' | 'warning';
}

export interface ParserOptions {
  dereference?: {
    /**
     * Determines whether circular `$ref` pointers are handled.
     *
     * If set to `false`, then a `ReferenceError` will be thrown if the schema contains any
     * circular references. If set to `ignore` then circular references will be ignored and their
     * `$ref` pointers will be left alone; if you use this in conjunction with `onCircular` you
     * will be able to see which paths in the schema contain circular references.
     *
     */
    circular?: boolean | 'ignore';

    /**
     * Callback invoked during circular reference detection.
     *
     * @param path - The path that is circular (ie. the `$ref` string)
     */
    onCircular?(path: string): void;

    /**
     * Callback invoked during dereferencing.
     *
     * @param path - The path being dereferenced (ie. the `$ref` string).
     * @param value - The JSON Schema that the `$ref` resolved to.
     * @param parent - The parent of the dereferenced object.
     * @param parentPropName - The prop name of the parent object whose value was dereferenced.
     */
    onDereference?(path: string, value: JSONSchemaObject, parent?: JSONSchemaObject, parentPropName?: string): void;
  };

  resolve?: {
    /**
     * Determines whether external $ref pointers will be resolved. If this option is disabled, then
     * external `$ref` pointers will simply be ignored.
     */
    external?: boolean;

    /**
     * Determines if local files are allowed to be resolved. If this option is `true` then the
     * default behavior within `@apidevtools/json-schema-ref-parser` will be utilized.
     */
    file?: boolean;

    http?: {
      /**
       * The amount of time (in milliseconds) to wait for a response from a server when downloading
       * an API definition. The default is 5 seconds.
       */
      timeout?: number;
    };
  };

  validate?: {
    errors?: {
      /**
       * Configures if you want validation errors that are thrown to be colorized. The default is
       * `false`.
       */
      colorize?: boolean;
    };

    rules?: {
      openapi?: Partial<ParserRulesOpenAPI>;

      /**
       * Swagger validation rules cannot be configured and are always treated as errors.
       */
      swagger?: never;
    };
  };
}
