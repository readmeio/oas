import type $RefParserOptions from '@apidevtools/json-schema-ref-parser/dist/lib/options';
import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

export type APIDocument<T extends object = NonNullable<unknown>> =
  | OpenAPIV2.Document<T>
  | OpenAPIV3_1.Document<T>
  | OpenAPIV3.Document<T>;

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
    circular?: $RefParserOptions['dereference']['circular'];

    /**
     * Callback invoked during circular reference detection.
     *
     * @param path - The path that is circular (ie. the `$ref` string)
     */
    onCircular?: $RefParserOptions['dereference']['onCircular'];

    /**
     * Callback invoked during dereferencing.
     *
     * @param path - The path being dereferenced (ie. the `$ref` string).
     * @param value - The JSON Schema that the `$ref` resolved to.
     * @param parent - The parent of the dereferenced object.
     * @param parentPropName - The prop name of the parent object whose value was dereferenced.
     */
    onDereference?: $RefParserOptions['dereference']['onDereference'];
  };

  resolve: {
    /**
     * Determines whether external $ref pointers will be resolved. If this option is disabled, then
     * external `$ref` pointers will simply be ignored.
     */
    external?: $RefParserOptions['resolve']['external'];
  };

  validate?: {
    /**
     * Configures if you want validation errors that are thrown to be colorized. The default is
     * `false`.
     *
     */
    colorizeErrors?: boolean;
  };
}
