import type { APIDocument, ParserOptions } from './types.js';
import type { ParserOptions as $RefParserOptions, ResolverOptions } from '@apidevtools/json-schema-ref-parser';

import { getJsonSchemaRefParserDefaultOptions } from '@apidevtools/json-schema-ref-parser';

import { isOpenAPI } from './lib/assertions.js';
import { createRootlessFileResolver, createSandboxedFileResolver, directoryOfSource } from './lib/file-root.js';
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
 * Convert our `resolve.file` option into a resolver `@apidevtools/json-schema-ref-parser` can run.
 *
 * `true` installs a resolver jailed to `fileRoot`, or to the source file's directory when the
 * caller passed a filesystem path and no root. An inline schema with no root gets a resolver that
 * refuses every filesystem read. A custom resolver object is left untouched.
 */
function convertFileResolverOption(
  options: ParserOptions | undefined,
  opts: {
    allowFileResolution?: boolean;
    sourcePath?: string;
  },
): FileResolverOption {
  const fileValue = options?.resolve && 'file' in options.resolve ? (options.resolve.file as unknown) : undefined;

  if (isCustomFileResolver(fileValue)) {
    return fileValue;
  }

  const explicitlySet = Boolean(options?.resolve && 'file' in options.resolve);
  const enabled = fileValue === true || (Boolean(opts.allowFileResolution) && !explicitlySet);
  if (!enabled) {
    return false;
  }

  const root = options?.resolve?.fileRoot || (opts.sourcePath ? directoryOfSource(opts.sourcePath) : undefined);
  if (!root) {
    return createRootlessFileResolver();
  }

  return createSandboxedFileResolver(root);
}

function isCustomFileResolver(fileValue: unknown): fileValue is Partial<ResolverOptions> {
  return typeof fileValue === 'object' && fileValue !== null;
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
     * they explicitly set `resolve.file`. The resolver is jailed to `resolve.fileRoot` or, when
     * that is omitted, to the source file's directory.
     */
    allowFileResolution?: boolean;

    /**
     * Filesystem path of the API source. Used as the default jail when `resolve.fileRoot` is omitted.
     */
    sourcePath?: string;
  } = {},
): Partial<$RefParserOptions> {
  const parserOptions = getJsonSchemaRefParserDefaultOptions();
  const fileOption = convertFileResolverOption(options, opts);

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
