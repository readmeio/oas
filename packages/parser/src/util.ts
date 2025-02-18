import type { APIDocument, ParserOptions } from './types.js';
import type { ParserOptions as $RefParserOptions } from '@apidevtools/json-schema-ref-parser';

import { getJsonSchemaRefParserDefaultOptions } from '@apidevtools/json-schema-ref-parser';
import merge from 'lodash/merge.js';

import { isOpenAPI } from './lib/index.js';
import { fixOasRelativeServers } from './repair.js';

/**
 * If necessary, repair the schema of any anomalies and quirks.
 *
 */
export function repairSchema<S extends APIDocument = APIDocument>(schema: S, filePath?: string): void {
  if (isOpenAPI(schema)) {
    // This is an OpenAPI v3 schema, check if the configured `servers` have any relative paths and
    // fix them if the content was pulled from a web resource.
    fixOasRelativeServers(schema, filePath);
  }
}

/**
 * Normalize our library variable arguments into a standard format to be used within
 * `json-schema-ref-parser`.
 *
 */
export function normalizeArguments<S extends APIDocument = APIDocument>(
  api: S | string,
): { path: string; schema: S | undefined } {
  return {
    path: typeof api === 'string' ? api : '',
    schema: typeof api === 'object' ? (api as S) : undefined,
  };
}

/**
 * Convert our option set to be used within `json-schema-ref-parser`.
 *
 */
export function convertOptionsForParser(options: ParserOptions): Partial<$RefParserOptions> {
  return merge(getJsonSchemaRefParserDefaultOptions(), {
    dereference: {
      circular: options?.dereference && 'circular' in options.dereference ? options.dereference.circular : undefined,
      onCircular: options?.dereference?.onCircular || undefined,
      onDereference: options?.dereference?.onDereference || undefined,

      // OpenAPI 3.1 allows for `summary` and `description` properties at the same level as a `$ref`
      // pointer to be preserved when that `$ref` pointer is dereferenced. The default behavior of
      // `json-schema-ref-parser` is to discard these properties but this option allows us to
      // override that behavior.
      preservedProperties: ['summary', 'description'],
    },
    resolve: {
      external: options?.resolve && 'external' in options.resolve ? options.resolve.external : undefined,
    },
  });
}
