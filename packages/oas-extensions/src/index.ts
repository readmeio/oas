import type Oas from 'oas';
import type Operation from 'oas/operation';

export const CODE_SAMPLES = 'code-samples';
export const EXPLORER_ENABLED = 'explorer-enabled';
export const HEADERS = 'headers';
export const METRICS_ENABLED = 'metrics-enabled';
export const PROXY_ENABLED = 'proxy-enabled';
export const SAMPLES_ENABLED = 'samples-enabled';
export const SAMPLES_LANGUAGES = 'samples-languages';
export const SEND_DEFAULTS = 'send-defaults';
export const SIMPLE_MODE = 'simple-mode';

// Make sure you document any changes on here:
// https://docs.readme.com/docs/openapi-extensions
export interface Extensions {
  [CODE_SAMPLES]: {
    code: string;
    install?: string;
    language: string;
    name?: string;
  };
  [EXPLORER_ENABLED]: boolean;
  [HEADERS]: Record<string, string | number>[];
  [METRICS_ENABLED]: boolean;
  [PROXY_ENABLED]: boolean;
  [SAMPLES_ENABLED]: boolean; // @deprecated
  [SAMPLES_LANGUAGES]: string[];
  [SEND_DEFAULTS]: boolean; // @deprecated
  [SIMPLE_MODE]: boolean;
}

export const defaults: Extensions = {
  [CODE_SAMPLES]: undefined,
  [EXPLORER_ENABLED]: true,
  [HEADERS]: undefined,
  [METRICS_ENABLED]: true,
  [PROXY_ENABLED]: true,
  [SAMPLES_ENABLED]: true,
  [SAMPLES_LANGUAGES]: ['shell', 'node', 'ruby', 'php', 'python', 'java', 'csharp'],
  [SEND_DEFAULTS]: false,
  [SIMPLE_MODE]: true,
};

/**
 * With one of our custom OpenAPI extensions, look for it in either an instance of `oas` or an
 * instance of the `Operation` class in `oas`.
 *
 * Our custom extensions can either be nestled inside of an `x-readme` object or at the root level
 * with an `x-` prefix.
 *
 * @see {@link https://npm.im/oas}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specificationExtensions}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions}
 * @param extension Specification extension to lookup.
 * @param oas An instance of the `oas` library class.
 * @param operation An instsance of the `Operation` class from the `oas` library.
 * @returns Contents of the extension if found, otherwise the extensions default value.
 */
export function getExtension(extension: keyof Extensions, oas: Oas, operation?: Operation) {
  if (operation) {
    if (operation.hasExtension('x-readme')) {
      const data = operation.getExtension('x-readme') as Extensions;
      if (data && typeof data === 'object' && extension in data) {
        return data[extension];
      }
    }

    if (operation.hasExtension(`x-${extension}`)) {
      return operation.getExtension(`x-${extension}`);
    }
  }

  // Because our `code-samples` extension is intended for operation-level use, if it's instead
  // placed at the OAS-level we should ignore it.
  if (extension === CODE_SAMPLES) {
    return defaults[extension];
  }

  if (oas.hasExtension('x-readme')) {
    const data = oas.getExtension('x-readme') as Extensions;
    if (data && typeof data === 'object' && extension in data) {
      return data[extension];
    }
  }

  if (oas.hasExtension(`x-${extension}`)) {
    return oas.getExtension(`x-${extension}`);
  }

  return defaults[extension];
}

/**
 * With one of our custom OpenAPI extensions, determine if it's valid on a given instance of `oas`.
 *
 * @todo add support for validating on operations.
 *
 * @see {@link https://npm.im/oas}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specificationExtensions}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions}
 * @param extension Specification extension to lookup.
 * @param oas An instance of the `oas` library class.
 */
export function validateExtension(extension: keyof Extensions, oas: Oas) {
  if (oas.hasExtension('x-readme')) {
    const data = oas.getExtension('x-readme') as Extensions;
    if (typeof data !== 'object' || Array.isArray(data) || data === null) {
      throw new TypeError('"x-readme" must be of type "Object"');
    }

    if (extension in data) {
      if ([CODE_SAMPLES, HEADERS, SAMPLES_LANGUAGES].includes(extension)) {
        if (!Array.isArray(data[extension])) {
          throw new TypeError(`"x-readme.${extension}" must be of type "Array"`);
        }
      } else if (typeof data[extension] !== 'boolean') {
        throw new TypeError(`"x-readme.${extension}" must be of type "Boolean"`);
      }
    }
  }

  // If the extension isn't grouped under `x-readme`, we need to look for them with `x-` prefixes.
  if (oas.hasExtension(`x-${extension}`)) {
    const data = oas.getExtension(`x-${extension}`);
    if ([CODE_SAMPLES, HEADERS, SAMPLES_LANGUAGES].includes(extension)) {
      if (!Array.isArray(data)) {
        throw new TypeError(`"x-${extension}" must be of type "Array"`);
      }
    } else if (typeof data !== 'boolean') {
      throw new TypeError(`"x-${extension}" must be of type "Boolean"`);
    }
  }
}
