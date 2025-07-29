import YAML, { JSON_SCHEMA } from 'js-yaml';

// biome-ignore lint/performance/noBarrelFile: This isn't a barrel file, we're re-exporting a function from another package.
export { compileErrors } from '@readme/openapi-parser';

/**
 * Determine if a given variable is a `Buffer`.
 *
 */
// biome-ignore lint/suspicious/noExplicitAny: This is a type guard.
export function isBuffer(obj: any): boolean {
  return (
    obj != null &&
    obj.constructor != null &&
    typeof obj.constructor.isBuffer === 'function' &&
    !!obj.constructor.isBuffer(obj)
  );
}

/**
 * Deconstruct a URL into a payload for a `fetch` request.
 *
 */
export function prepareURL(url: string): { options: RequestInit; url: string } {
  const options: RequestInit = {};
  const u = new URL(url);

  // `fetch` doesn't support supplying basic auth credentials in the URL so we need to move them
  // into a header.
  if (u.username || u.password) {
    options.headers = {
      Authorization: `Basic ${btoa(`${u.username}:${u.password}`)}`,
    };

    u.username = '';
    u.password = '';
  }

  // Transform GitHub sources into their raw content URLs.
  if (u.host === 'github.com' && u.pathname.includes('/blob/')) {
    u.host = 'raw.githubusercontent.com';
    u.pathname = u.pathname.replace('/blob/', '/');
  }

  return {
    url: u.toString(),
    options,
  };
}

/**
 * Determine the type of a given variable. Returns `false` if unrecognized.
 *
 */
// biome-ignore lint/suspicious/noExplicitAny: This function handles type narrowing.
export function getType(obj: any): 'buffer' | 'json' | 'path' | 'string-json' | 'string-yaml' | 'url' | false {
  if (isBuffer(obj)) {
    return 'buffer';
  } else if (typeof obj === 'object') {
    return 'json';
  } else if (typeof obj === 'string') {
    if (obj.match(/\s*{/)) {
      return 'string-json';
    } else if (obj.match(/\n/)) {
      // Not sure about this...
      return 'string-yaml';
    } else if (obj.substring(0, 4) === 'http') {
      return 'url';
    }

    return 'path';
  }

  return false;
}

/**
 * Determine if a given schema if an OpenAPI definition.
 *
 */
export function isOpenAPI(schema: Record<string, unknown>): boolean {
  return !!schema.openapi;
}

/**
 * Determine if a given schema is a Postman collection.
 *
 * Unfortunately the Postman schema spec doesn't have anything like `openapi` or `swagger` for us
 * to look at but it does require that `info` and `item` be present and as `item` doesn't exist in
 * OpenAPI or Swagger we can use the combination of those two properties to determine if what we
 * have is a Postman collection.
 *
 * @see {@link https://schema.postman.com/json/collection/v2.0.0/collection.json}
 * @see {@link https://schema.postman.com/json/collection/v2.1.0/collection.json}
 */
export function isPostman(schema: Record<string, unknown>): boolean {
  return !!schema.info && !!schema.item;
}

/**
 * Determine if a given schema if an Swagger definition.
 *
 */
export function isSwagger(schema: Record<string, unknown>): boolean {
  return !!schema.swagger;
}

/**
 * Convert a YAML blob or stringified JSON object into a JSON object.
 *
 */
export function stringToJSON(string: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof string === 'object') {
    return string;
  } else if (string.match(/^\s*{/)) {
    return JSON.parse(string);
  }

  return YAML.load(string, { schema: JSON_SCHEMA }) as Record<string, unknown>;
}

/**
 * Determine if a given schema is an API definition that we can support.
 *
 */
export function isAPIDefinition(schema: Record<string, unknown>): boolean {
  return isOpenAPI(schema) || isPostman(schema) || isSwagger(schema);
}

/**
 * Retrieve the type of API definition that a given schema is.
 *
 */
export function getAPIDefinitionType(schema: Record<string, unknown>): 'openapi' | 'postman' | 'swagger' | 'unknown' {
  if (isOpenAPI(schema)) {
    return 'openapi';
  } else if (isPostman(schema)) {
    return 'postman';
  } else if (isSwagger(schema)) {
    return 'swagger';
  }

  return 'unknown';
}
