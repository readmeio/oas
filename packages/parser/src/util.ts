import type { APIDocument, ParserOptions } from './types.js';
import type { ParserOptions as $RefParserOptions } from '@apidevtools/json-schema-ref-parser';

import { getJsonSchemaRefParserDefaultOptions } from '@apidevtools/json-schema-ref-parser';

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
  const parserOptions = getJsonSchemaRefParserDefaultOptions();

  return {
    ...parserOptions,
    dereference: {
      ...parserOptions.dereference,

      circular:
        options?.dereference && 'circular' in options.dereference
          ? options.dereference.circular
          : parserOptions.dereference.circular,
      onCircular: options?.dereference?.onCircular || parserOptions.dereference.onCircular,
      onDereference: options?.dereference?.onDereference || parserOptions.dereference.onDereference,

      // OpenAPI 3.1 allows for `summary` and `description` properties at the same level as a `$ref`
      // pointer to be preserved when that `$ref` pointer is dereferenced. The default behavior of
      // `json-schema-ref-parser` is to discard these properties but this option allows us to
      // override that behavior.
      preservedProperties: ['summary', 'description'],
    },

    resolve: {
      ...parserOptions.resolve,

      external:
        options?.resolve && 'external' in options.resolve ? options.resolve.external : parserOptions.resolve.external,

      file: options?.resolve && 'file' in options.resolve ? options.resolve.file : parserOptions.resolve.file,

      http: {
        ...(typeof parserOptions.resolve.http === 'object' ? parserOptions.resolve.http : {}),
        timeout: options?.resolve?.http && 'timeout' in options.resolve.http ? options.resolve.http.timeout : 5000,
      },
    },
  };
}
