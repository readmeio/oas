import type { ParserOptions } from '@readme/openapi-parser';

export type { ValidationResult, ErrorDetails, WarningDetails } from '@readme/openapi-parser';

export interface Options {
  /**
   * Configures if you want validation errors that are thrown to be colorized. The default is
   * `false`.
   */
  colorizeErrors?: boolean;

  /**
   * If you want to allow fetching of local paths. For security reasons the default is `false`.
   */
  enablePaths?: boolean;

  /**
   * Options to supply to our OpenAPI parser. See `@readme/openapi-parser` for documentation.
   *
   * @see {@link https://npm.im/@readme/openapi-parser}
   */
  parser?: ParserOptions;
}
