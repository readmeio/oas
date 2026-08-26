import type { OpenAPI, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import { isOpenAPI } from './lib/assertions.js';
import { supportedHTTPMethods } from './lib/index.js';

/** Keywords whose values are literal data, not subschemas — a `$id` inside them is user data. */
const DATA_KEYWORDS = new Set(['example', 'examples', 'default', 'const', 'enum']);

/** Collect every `$ref` string in the definition, so we can tell which `$id`s are referenced. */
function collectRefs(node: unknown, refs: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach(item => collectRefs(item, refs));
  } else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') {
        refs.add(value);
      } else if (!DATA_KEYWORDS.has(key)) {
        collectRefs(value, refs);
      }
    }
  }
}

function isRelativeRef(ref: string): boolean {
  return !ref.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(ref);
}

/**
 * Whether anything in `scope` depends on `scope`'s `$id` as its base URI — a relative `$ref`, or a
 * nested relative `$id` (which also resolves against the enclosing base). We stop at nested `$id`
 * boundaries (they open their own scope), except a *relative* nested `$id` still pins `scope`.
 */
function scopeHasRelativeRef(scope: Record<string, unknown>): boolean {
  const search = (node: unknown, isScopeRoot: boolean): boolean => {
    if (Array.isArray(node)) {
      return node.some(item => search(item, false));
    }

    if (node === null || typeof node !== 'object') {
      return false;
    }

    const obj = node as Record<string, unknown>;
    if (!isScopeRoot && typeof obj.$id === 'string') {
      return isRelativeRef(obj.$id);
    }

    return Object.entries(obj).some(([key, value]) => {
      if (key === '$ref' && typeof value === 'string') {
        return isRelativeRef(value);
      }
      return !DATA_KEYWORDS.has(key) && search(value, false);
    });
  };

  return search(scope, true);
}

/**
 * Remove orphaned `$id` keywords from an API definition.
 *
 * In OpenAPI 3.1, `$id` sets a new base URI for `$ref` resolution within its subschema. Bundling can
 * leave a `$id` on an inlined schema whose own refs were rewritten to internal `#/…` pointers; that
 * leftover `$id` then re-scopes those pointers away from the definition root, so resolution throws a
 * spurious "Missing $ref pointer" error. Tooling historically ignored `$id`, so such definitions
 * were long accepted.
 *
 * We strip a `$id` only when nothing depends on it — it's not a `$ref` target, not a base URI for a
 * relative `$ref` beneath it, and not the root `$id`. These are conservative string-level checks,
 * not full RFC 3986 resolution: they always err towards *keeping* a `$id`, so we never break a
 * working definition (a `$id` used as an in-document anchor is preserved). The cost is that a rare
 * construct a string compare can't disambiguate (e.g. the same relative id reused across scopes) is
 * left as-is — unimproved, but never broken.
 */
export function stripOrphanedIds(schema: unknown): void {
  const refs = new Set<string>();
  collectRefs(schema, refs);

  const isReferenced = (id: string): boolean => {
    for (const ref of refs) {
      // Substring, not exact match: a `$ref` resolving to a relative `$id` contains it without
      // equalling it (e.g. `$ref: "schemas/inner.json"` targets `$id: "inner.json"`). Matching
      // broadly means we never strip a live target; the cost is a safe over-keep when a `$id` value
      // merely appears in an unrelated ref.
      if (ref.includes(id)) return true;
    }
    return false;
  };

  const visit = (node: unknown, isRoot: boolean): void => {
    if (Array.isArray(node)) {
      node.forEach(item => visit(item, false));
    } else if (node !== null && typeof node === 'object') {
      const obj = node as Record<string, unknown>;

      // Post-order: decide nested `$id`s first, since removing an inner one can free the outer.
      for (const [key, value] of Object.entries(obj)) {
        if (!DATA_KEYWORDS.has(key)) {
          visit(value, false);
        }
      }

      if (!isRoot && typeof obj.$id === 'string' && !isReferenced(obj.$id) && !scopeHasRelativeRef(obj)) {
        delete obj.$id;
      }
    }
  };

  // `isRoot` is `true` here so we never strip the document's own top-level `$id`.
  visit(schema, true);
}

/**
 * This function takes in a `ServerObject`, checks if it has relative path and then fixes it as per
 * the path URL.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#server-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-object}
 *
 * @param server - The server object to be fixed.
 * @param path - The path (an HTTP(S) url) from where the file was downloaded.
 * @returns The fixed server object
 */
function fixServers(
  server: OpenAPIV3_1.ReferenceObject | OpenAPIV3.ParameterObject | OpenAPIV3.ServerObject,
  path: string,
) {
  // A server URL starting with "/" tells that it is not an HTTP(s) URL.
  if (server && 'url' in server && server.url && server.url.startsWith('/')) {
    try {
      const inUrl = new URL(path);

      server.url = `${inUrl.protocol}//${inUrl.hostname}${server.url}`;
    } catch {
      // The server path isn't valid but we shouldn't crash out.
    }
  }
}

/**
 * This function helps fix the relative servers in the API definition file be at root, path or
 * operation's level.
 *
 * From the OpenAPI v3 specification for the `ServerObject` `url` property:
 *
 *    REQUIRED. A URL to the target host. This URL supports Server Variables and MAY be relative,
 *    to indicate that the host location is relative to the location where the OpenAPI document is
 *    being served. Variable substitutions will be made when a variable is named in `{brackets}`.
 *
 * Further the spec says that `servers` property can show up at root level, in `PathItemObject` or
 * in `OperationObject`. However interpretation of the spec says that relative paths for servers
 * should take into account the hostname that serves the OpenAPI file.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#server-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-object}
 */
export function fixOasRelativeServers(schema: OpenAPI.Document, filePath?: string): void {
  if (!schema || !isOpenAPI(schema) || !filePath || (!filePath.startsWith('http:') && !filePath.startsWith('https:'))) {
    return;
  }

  if (schema.servers) {
    schema.servers.map(server => fixServers(server, filePath)); // Root level servers array's fixup
  }

  (['paths', 'webhooks'] as const).forEach(component => {
    if (component in schema) {
      const schemaElement = (schema as OpenAPIV3_1.Document)[component] || {};
      Object.keys(schemaElement).forEach(path => {
        const pathItem = schemaElement[path] || {};
        Object.keys(pathItem).forEach((opItem: keyof typeof pathItem) => {
          const pathItemElement = pathItem[opItem];
          if (!pathItemElement) {
            return;
          }

          /**
           * Servers are at the `PathItemObject` level.
           *
           * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#path-item-object}
           * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object}
           */
          if (opItem === 'servers' && Array.isArray(pathItemElement)) {
            pathItemElement.forEach(server => {
              fixServers(server, filePath);
            });
            return;
          }

          /**
           * Servers are at the `OperationObject` level.
           *
           * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#operation-object}
           * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operation-object}
           */
          if (
            supportedHTTPMethods.includes(opItem as unknown as (typeof supportedHTTPMethods)[number]) &&
            typeof pathItemElement === 'object' &&
            'servers' in pathItemElement &&
            Array.isArray(pathItemElement.servers)
          ) {
            pathItemElement.servers.forEach(server => {
              fixServers(server, filePath);
            });
          }
        });
      });
    }
  });
}
