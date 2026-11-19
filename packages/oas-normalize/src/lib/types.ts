import type { ParserOptions } from '@readme/openapi-parser';

export type { ErrorDetails, ValidationResult, WarningDetails } from '@readme/openapi-parser';

export interface Options {
  /**
   * Configures if you want validation errors that are thrown to be colorized. The default is
   * `false`.
   */
  colorizeErrors?: boolean;

  /**
   * If you want to allow fetching of local paths. For security reasons the default is `false`.
   *
   * Filesystem `$ref`s stay inside `pathsRoot`. When this is `true` and the input is a local file,
   * that file's directory is the root until `pathsRoot` says otherwise. Inline definitions, strings,
   * buffers, and URLs do not read the filesystem until `pathsRoot` is set.
   */
  enablePaths?: boolean;

  /**
   * Options to supply to our OpenAPI parser. See `@readme/openapi-parser` for documentation.
   *
   * @see {@link https://npm.im/@readme/openapi-parser}
   */
  parser?: ParserOptions;

  /**
   * Directory that every filesystem `$ref` must resolve inside when `enablePaths` is `true`.
   *
   * Absolute paths, `file://` URLs, and `..` segments are allowed only when the resolved file stays
   * in this directory. Symlinks are not followed. The path is resolved and `realpath`'d when the
   * instance is constructed. When the input is a local file and this is omitted, the file's own
   * directory is used. The entry file itself must also stay inside this directory.
   */
  pathsRoot?: string;
}
