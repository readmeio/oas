import type { APIDocument, ParserOptions } from './types.js';
import type { ParserOptions as $RefParserOptions, ResolverOptions } from '@apidevtools/json-schema-ref-parser';

import { getJsonSchemaRefParserDefaultOptions } from '@apidevtools/json-schema-ref-parser';

import { isOpenAPI } from './lib/assertions.js';
import { fixOasRelativeServers } from './repair.js';

type FileResolverOption = boolean | Partial<ResolverOptions> | undefined;

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
 * Convert our `resolve.file` option into something `@apidevtools/json-schema-ref-parser`
 * understands.
 *
 */
function convertFileResolverOption(
  options: ParserOptions | undefined,
  defaultFileResolver: FileResolverOption,
): FileResolverOption {
  if (!options?.resolve || !('file' in options.resolve)) {
    return false;
  }

  if (options.resolve.file === true) {
    return defaultFileResolver;
  }

  if (options.resolve.file === false) {
    return false;
  }

  // Caller supplied a custom resolver object.
  return options.resolve.file as FileResolverOption;
}

/**
 * Convert our option set to be used within `json-schema-ref-parser`.
 *
 */
export function convertOptionsForParser(
  options: ParserOptions | undefined,
  opts: {
    /**
     * When the caller passed a filesystem path as the API source, enable the file resolver unless
     * they explicitly set `resolve.file`. This keeps local path loading working without re-opening
     * `file://` LFI for object/URL sources
     */
    allowFileResolution?: boolean;
  } = {},
): Partial<$RefParserOptions> {
  const parserOptions = getJsonSchemaRefParserDefaultOptions();

  const fileOption =
    opts.allowFileResolution && !(options?.resolve && 'file' in options.resolve)
      ? parserOptions.resolve.file
      : convertFileResolverOption(options, parserOptions.resolve.file);

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

      file: fileOption,

      http: {
        ...(typeof parserOptions.resolve.http === 'object' ? parserOptions.resolve.http : {}),
        ...(typeof options?.resolve?.http === 'object' ? options.resolve.http : {}),
        timeout: options?.resolve?.http && 'timeout' in options.resolve.http ? options.resolve.http.timeout : 5000,
        safeUrlResolver: true,
      },
    },

    timeoutMs: options?.timeoutMs,
  };
}
