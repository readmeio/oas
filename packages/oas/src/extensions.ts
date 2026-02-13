import type { Operation } from './operation/index.js';
import type { OASDocument } from './types.js';

/**
 * Enables custom-written code samples to be set for your operations. Use this if you have specific
 * formatting that may not be followed by the auto-generated code samples. Custom code samples are
 * treated as static content.
 *
 * This extension only be placed at the operation level.
 *
 * @defaultValue []
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#custom-code-samples}
 * @example
 * {
 *  "x-readme": {
 *    "code-samples": [
 *      {
 *        "language": "curl",
 *        "code": "curl -X POST https://api.example.com/v2/alert",
 *        "name": "Custom cURL snippet",
 *        "install": "brew install curl"
 *      },
 *      {
 *        "language": "php",
 *        "code": "<?php echo \"This is our custom PHP code snippet.\"; ?>",
 *        "name": "Custom PHP snippet"
 *      }
 *    ]
 *  }
 * }
 */
export const CODE_SAMPLES = 'code-samples';

/**
 * Disables the API Explorer's "Try It" button, preventing users from making API requests from
 * within your docs. Users will still be able to fill out any entry fields (path or query
 * parameters, etc.), and code snippets will be auto-generated based on the user's input, however
 * to interact with your API the user will need to copy the code snippet and execute it outside of
 * your docs.
 *
 * This **does not** disable your API Reference documentation.
 *
 * @defaultValue true
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#disable-the-api-explorer}
 * @example
 * {
 *  "x-readme": {
 *    "explorer-enabled": true
 *  }
 * }
 */
export const EXPLORER_ENABLED = 'explorer-enabled';

/**
 * Adds static headers to add to each request. Use this when there are specific headers unique to
 * your API.
 *
 * @defaultValue []
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#static-headers}
 * @example
 * {
 *  "x-readme": {
 *    "headers": [
 *      {
 *        "key": "X-Static-Header-One",
 *        "value": "owlbert"
 *      },
 *      {
 *        "key": "X-Static-Header-Two",
 *        "value": "owlivia"
 *      }
 *    ]
 *  }
 * }
 */
export const HEADERS = 'headers';

/**
 * Allows you to mark an API endpoint, or _every_ API endpoint if defined in the root, as being
 * internal and hidden from your public API reference.
 *
 * @defaultValue false
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#internal}
 * @example
 * {
 *  "x-internal": true
 * }
 * @example
 * {
 *  "x-readme": {
 *    "internal": true
 *  }
 * }
 */
export const INTERNAL = 'internal';

/**
 * Disables API requests from the API Explorer's "Try It" button from being sent into our [API
 * Metrics](https://readme.com/metrics) for you and your users. Additionally on any API endpoint
 * that this is disabled on your users will not see lists or graphs of previous requests they've
 * made against that API endpoint — either through the API Explorer's interactivity or through one
 * of our [Metrics SDKs](https://docs.readme.com/main/docs/api-metrics-setup) (if you have those
 * installed on your API).
 *
 * @defaultValue true
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#disable-api-metrics}
 * @example
 * {
 *  "x-readme": {
 *    "metrics-defaults": false
 *  }
 * }
 */
export const METRICS_ENABLED = 'metrics-enabled';

/**
 * Configuration options for OAuth flows in the API Explorer.
 *
 * @defaultValue {}
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#oauth-configuration-options}
 * @example
 * {
 *  "x-readme": {
 *    "oauth-options": {
 *      "scopeSeparator": ",",
 *      "useInsecureClientAuthentication": true,
 *      "usePkce": false
 *    }
 *  }
 * }
 */
export const OAUTH_OPTIONS = 'oauth-options';

/**
 * Controls the order of parameters on your API Reference pages.
 *
 * Your custom ordering **must** contain all of our available parameter types:
 *
 *  - `path`: Path parameters
 *  - `query`: Query parameters
 *  - `body`: Non-`application/x-www-form-urlencoded` request body payloads
 *  - `cookie`: Cookie parameters
 *  - `form`: `application/x-www-form-urlencoded` request body payloads
 *  - `header`: Header parameters
 *
 * @defaultValue ['path', 'query', 'body', 'cookie', 'form', 'header']
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#parameter-ordering}
 * @example
 * {
 *  "x-readme": {
 *    "parameter-ordering": ['path', 'query', 'header', 'cookie', 'body', 'form']
 *  }
 * }
 */
export const PARAMETER_ORDERING = 'parameter-ordering';

/**
 * Toggles the CORS proxy used when making API requests from within your docs (via the "Try It"
 * button). If your API is already set up to return CORS headers, you can safely disable this
 * feature.
 *
 * Disabling the CORS proxy will make the request directly from the user's browser and will prevent
 * [Metrics](https://docs.readme.com/main/docs/getting-started-with-metrics) data from being logged
 * by us unless [Metrics have already set up on your backend](https://docs.readme.com/main/docs/api-metrics-setup).
 *
 * @defaultValue true
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#cors-proxy-enabled}
 * @example
 * {
 *  "x-readme": {
 *    "proxy-enabled": true
 *  }
 * }
 */
export const PROXY_ENABLED = 'proxy-enabled';

/**
 * Toggles what languages are shown by default for code samples in the API Explorer. This only
 * affects what languages are initially shown to the user; if the user picks another language from
 * the three-dot menu, that language and the respective auto-generated code snippet will also appear
 * as an option in the API Explorer.
 *
 * @defaultValue ['shell', 'node', 'ruby', 'php', 'python', 'java', 'csharp']
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#code-sample-languages}
 * @example
 * {
 *  "x-readme": {
 *    "samples-languages": ["shell", "node", "ruby", "javascript", "python"]
 *  }
 * }
 */
export const SAMPLES_LANGUAGES = 'samples-languages';

/**
 * Toggles if you will see code snippets for ReadMe's SDK code generator tool `api`.
 *
 * @defaultValue true
 * @see {@link https://api.readme.dev}
 * @example
 * {
 *  "x-readme": {
 *    "simple-mode": false
 *  }
 * }
 */
export const SIMPLE_MODE = 'simple-mode';

/**
 * If `true`, tags are generated from the file top-down. If `false`, we sort the tags
 * based off the `tags` array in the OAS file.
 *
 * @defaultValue false
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#disable-tag-sorting}
 * @example
 * {
 *  "x-readme": {
 *    "disable-tag-sorting": true
 *  }
 * }
 */
export const DISABLE_TAG_SORTING = 'disable-tag-sorting';

export interface Extensions {
  [CODE_SAMPLES]:
    | {
        /**
         * Custom code snippet
         * @example "curl -X POST https://api.example.com/v2/alert"
         */
        code: string;
        /**
         * Corresponding response example
         * @see {@link https://docs.readme.com/main/docs/openapi-extensions#corresponding-response-examples}
         */
        correspondingExample?: string;
        /**
         * Library installation instructions
         * @example "brew install httpie"
         * @example "npm install node-fetch@2 --save"
         */
        install?: string;
        /**
         * Language for syntax highlighting
         * @example shell
         */
        language: string;
        /**
         * Optional title for code sample
         * @example "Custom cURL snippet"
         */
        name?: string;
      }[]
    | undefined;
  [DISABLE_TAG_SORTING]: boolean;
  [EXPLORER_ENABLED]: boolean;
  [HEADERS]: Record<string, number | string>[] | undefined;
  [INTERNAL]: boolean;
  [METRICS_ENABLED]: boolean;
  [OAUTH_OPTIONS]: {
    /**
     * Scope separator for passing scopes. This value will be URL-encoded.
     *
     * @example ","
     * @example "+"
     * @default " "
     * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-3.3} Scope separators information from OAuth 2.0 specification
     */
    scopeSeparator?: string;

    /**
     * When enabled, the client credentials (i.e., `client_id` and `client_secret`) are sent in the request body (NOT recommended).
     * When disabled (the default), client credentials are sent using the HTTP Basic Authentication scheme.
     *
     * This is applicable for all requests to the token endpoint.
     *
     * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1}
     * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-3.2}
     *
     * @example true
     * @default false
     */
    useInsecureClientAuthentication?: boolean;

    /**
     * When enabled, uses PKCE (Proof Key for Code Exchange) for the authorization code flow.
     * The client secret is replaced with an auto-generated code verifier and code challenge.
     * When disabled, uses the standard OAuth 2.0 authorization code flow with client credentials.
     *
     * @see {@link https://datatracker.ietf.org/doc/html/rfc7636#section-4.1}
     * @see {@link https://datatracker.ietf.org/doc/html/rfc7636#section-4.2}
     *
     * @example true
     * @default false
     */
    usePkce?: boolean;
  };
  [PARAMETER_ORDERING]: ('body' | 'cookie' | 'form' | 'header' | 'path' | 'query')[];
  [PROXY_ENABLED]: boolean;
  [SAMPLES_LANGUAGES]: string[];
  [SIMPLE_MODE]: boolean;
}

export const extensionDefaults: Extensions = {
  [CODE_SAMPLES]: undefined,
  [DISABLE_TAG_SORTING]: false,
  [EXPLORER_ENABLED]: true,
  [HEADERS]: undefined,
  [INTERNAL]: false,
  [METRICS_ENABLED]: true,
  [OAUTH_OPTIONS]: {},
  [PARAMETER_ORDERING]: ['path', 'query', 'body', 'cookie', 'form', 'header'],
  [PROXY_ENABLED]: true,
  [SAMPLES_LANGUAGES]: ['shell', 'node', 'ruby', 'php', 'python', 'java', 'csharp'],
  [SIMPLE_MODE]: true,
};

/**
 * Determing if an OpenAPI definition has an extension set in its root schema.
 *
 */
export function hasRootExtension(extension: string | keyof Extensions, api: OASDocument): boolean {
  return Boolean(api && extension in api);
}

/**
 * Retrieve a custom specification extension off of the API definition.
 *
 */
export function getExtension(extension: string | keyof Extensions, api: OASDocument, operation?: Operation): any {
  if (operation) {
    if (operation.hasExtension('x-readme')) {
      const data = operation.getExtension('x-readme') as Extensions;
      if (data && typeof data === 'object' && extension in data) {
        return data[extension as keyof Extensions];
      }
    }

    if (operation.hasExtension(`x-${extension}`)) {
      return operation.getExtension(`x-${extension}`);
    } else if (operation.hasExtension(extension)) {
      return operation.getExtension(extension);
    }
  }

  // Because our `code-samples` extension is intended for operation-level use, if it's instead
  // placed at the API definition root level then we should ignore it and return our set defaults.
  if (extension === CODE_SAMPLES) {
    return extensionDefaults[extension];
  }

  if (hasRootExtension('x-readme', api)) {
    const data = api?.['x-readme'] as Extensions;
    if (data && typeof data === 'object' && extension in data) {
      return data[extension as keyof Extensions];
    }
  }

  if (hasRootExtension(`x-${extension}`, api)) {
    return api?.[`x-${extension}`];
  } else if (hasRootExtension(extension, api)) {
    return api?.[extension];
  }

  // If this is otherwise an extension of our own then we should return the default value for it.
  if (extension in extensionDefaults) {
    return extensionDefaults[extension as keyof Extensions];
  }

  return undefined;
}

/**
 * Validate that the data for an instanceof our `PARAMETER_ORDERING` extension is properly
 * configured.
 *
 * @private
 */
export function validateParameterOrdering(
  ordering: (typeof extensionDefaults)[typeof PARAMETER_ORDERING] | undefined,
  extension: string,
): void {
  if (!ordering) {
    return;
  }

  const defaultValue = extensionDefaults[PARAMETER_ORDERING];
  const requiredLength = defaultValue.length;
  const defaultsHuman = `${defaultValue.slice(0, -1).join(', ')}, and ${defaultValue.slice(-1)}`;

  if (ordering?.length !== requiredLength) {
    throw new TypeError(`"${extension}" must contain ${requiredLength} items comprised of: ${defaultsHuman}`);
  }

  const intersection = ordering.filter(value => defaultValue.includes(value.toLowerCase() as any));
  if (intersection.length !== requiredLength) {
    throw new TypeError(`"${extension}" must contain ${requiredLength} items comprised of: ${defaultsHuman}`);
  }
}
