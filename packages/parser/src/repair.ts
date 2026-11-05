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

function decodeURIRef(ref: string): string {
  try {
    return decodeURIComponent(ref);
  } catch {
    // Malformed percent-encoding; treat the reference literally.
    return ref;
  }
}

function decodePointerSegment(segment: string): string {
  // `$ref` fragments are URI-encoded, so `%20` must become a space before we compare keys.
  return decodeURIRef(segment).replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Whether `ref` is `#` or `#/…` exactly as written, with no percent-encoding. */
function isPlainPointer(ref: string): boolean {
  return ref === '#' || ref.startsWith('#/');
}

/**
 * Whether `ref` is a same-document JSON Pointer (`#`, `#/…`), including when the leading slash is
 * percent-encoded (`#%2Fcomponents/…`). Those never target a `$id` URI.
 */
function isDocumentRootPointer(ref: string): boolean {
  return isPlainPointer(decodeURIRef(ref));
}

/**
 * Whether `ref` may resolve to the schema with `$id: id`. Substring, not exact match: a `$ref`
 * resolving to a relative `$id` contains it without equalling it (e.g. `$ref: "schemas/inner.json"`
 * targets `$id: "inner.json"`). Matching broadly errs towards treating a `$id` as live.
 */
function refMayTargetId(ref: string, id: string): boolean {
  // Document-root JSON Pointers (`#/components/…`, `#/paths/…`, `#%2Fcomponents/…`) never target a
  // `$id` URI, though they can contain one as a substring (`$id: "Pet"` vs `#/components/schemas/Pet`).
  return !isDocumentRootPointer(ref) && ref.includes(id);
}

/**
 * Whether `ref` is a JSON Pointer that exists on `root`. `#` and `#/` are the resource root.
 */
function jsonPointerExists(root: unknown, ref: string): boolean {
  const decoded = decodeURIRef(ref);
  if (decoded === '#' || decoded === '#/') {
    return root !== undefined;
  }

  if (!decoded.startsWith('#/')) {
    return false;
  }

  const segments = decoded.slice(2).split('/').map(decodePointerSegment);
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }

    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return false;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return true;
}

/**
 * Whether anything in `scope` depends on `scope`'s `$id` as its base URI.
 *
 * That includes a relative `$ref`, a nested relative `$id` (which also resolves against the
 * enclosing base), a recursive `$ref: "#"` (the current resource), or a fragment pointer that
 * resolves inside `scope` (`#/$defs/…`). Document-root leftovers (`#/paths/…`, `#/components/…`)
 * do not pin it. We stop at nested `$id` boundaries (they open their own scope), except a
 * *relative* nested `$id` still pins `scope`.
 */
function scopeDependsOnId(scope: Record<string, unknown>): boolean {
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
        if (isRelativeRef(value)) {
          return true;
        }

        // `$ref: "#"` is the current `$id` resource. Stripping `$id` re-aims it at the document.
        // Keep `$id` when the pointer is local to this resource (`#/$defs/…`, including
        // percent-encoded `#%2F$defs/…`). Bundled leftovers that only exist at the document root
        // (`#/paths/…`, `#/components/…`) must not pin it.
        if (isDocumentRootPointer(value)) {
          return jsonPointerExists(scope, value);
        }

        return false;
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
 * relative `$ref` or local fragment (`#`, `#/$defs/…`) beneath it, and not the root `$id`. These are
 * conservative string-level checks, not full RFC 3986 resolution: they always err towards *keeping*
 * a `$id`, so we never break a working definition (a `$id` used as an in-document anchor is
 * preserved). The cost is that a rare construct a string compare can't disambiguate (e.g. the same
 * relative id reused across scopes) is left as-is — unimproved, but never broken.
 */
export function stripOrphanedIds(schema: unknown): void {
  const refs = new Set<string>();
  collectRefs(schema, refs);

  const isReferenced = (id: string): boolean => {
    for (const ref of refs) {
      if (refMayTargetId(ref, id)) return true;
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

      if (!isRoot && typeof obj.$id === 'string' && !isReferenced(obj.$id) && !scopeDependsOnId(obj)) {
        delete obj.$id;
      }
    }
  };

  // `isRoot` is `true` here so we never strip the document's own top-level `$id`.
  visit(schema, true);
}

/**
 * The bundler prefixes repeat refs under an inlined `$id` with a local path. Rewrite those refs, and
 * any `#/…` refs they share a `$id` with, as pointers from the document root, then remove those `$id`s.
 */
export function collapseBundledIdScopes(schema: unknown, rootPath: string): void {
  /** A schema with its own `$id`, its pointer from the document root, and the outermost `$id` schema above it. */
  interface IdScope {
    id: string;
    outer: Record<string, unknown>;
    pointer: string;
    schema: Record<string, unknown>;
  }

  /** A `$ref` and the `$id` schemas above it, outermost first. */
  interface ScopedRef {
    holder: { $ref: string };
    scopes: IdScope[];
  }

  const rootPrefix = `${rootPath}#`;
  const refs: ScopedRef[] = [];
  // Every `$id`, including those with no refs beneath them.
  const idScopes: IdScope[] = [];
  // A shared object is only visited at its first location, which only a JS object input can have.
  const seen = new WeakSet<object>();

  const visit = (node: unknown, pointer: string, scopes: IdScope[], isRoot: boolean): void => {
    if (node === null || typeof node !== 'object' || seen.has(node)) {
      return;
    }

    seen.add(node);
    const obj = node as Record<string, unknown>;
    let innerScopes = scopes;
    if (!isRoot && typeof obj.$id === 'string') {
      const scope = { id: obj.$id, outer: scopes[0]?.schema ?? obj, pointer, schema: obj };
      idScopes.push(scope);
      innerScopes = [...scopes, scope];
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key === '$ref' && typeof value === 'string') {
        refs.push({ holder: obj as ScopedRef['holder'], scopes: innerScopes });
      } else if (!DATA_KEYWORDS.has(key)) {
        visit(value, `${pointer}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`, innerScopes, false);
      }
    }
  };

  visit(schema, '#', [], true);

  const isRootPrefixed = ({ holder }: ScopedRef) => holder.$ref.startsWith(rootPrefix);
  const otherRefs = refs.filter(ref => !isRootPrefixed(ref)).map(({ holder }) => holder.$ref);

  // URI and anchor refs can't be rewritten as root pointers, so a group using one, or a `$id` some
  // URI ref may target, stays as the bundler wrote it.
  const canCollapse = (group: ScopedRef[], scopes: IdScope[]) =>
    group.some(isRootPrefixed) &&
    group.every(ref => isRootPrefixed(ref) || isPlainPointer(ref.holder.$ref)) &&
    !otherRefs.some(ref => scopes.some(({ id }) => refMayTargetId(ref, id)));

  // Grouped by outermost `$id`, since dropping one re-scopes every ref beneath it.
  const groups = Map.groupBy(
    refs.filter(ref => ref.scopes.length),
    ref => ref.scopes[0].schema,
  );
  const scopesByOuter = Map.groupBy(idScopes, scope => scope.outer);

  for (const [outer, group] of groups) {
    if (!canCollapse(group, scopesByOuter.get(outer) ?? [])) {
      continue;
    }

    // Every ref now points from the document root, so none of the group's `$id`s are needed.
    const scopesToCollapse = new Set<IdScope['schema']>();
    for (const { holder, scopes } of group) {
      holder.$ref = holder.$ref.startsWith(rootPrefix)
        ? holder.$ref.slice(rootPath.length)
        : scopes[scopes.length - 1].pointer + holder.$ref.slice(1);
      scopes.forEach(scope => scopesToCollapse.add(scope.schema));
    }
    scopesToCollapse.forEach(scope => delete scope.$id);
  }
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

      // `host` keeps a non-default port; `hostname` would drop it and rewrite
      // `https://api.example.com:8443` + `/hooks` to `https://api.example.com/hooks`.
      server.url = `${inUrl.protocol}//${inUrl.host}${server.url}`;
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
      // Webhooks use the same Path Item shape as `paths`. Cast so the loop below keeps the
      // original `paths` typings — `schema[component]` is a `paths | webhooks` union.
      const schemaElement = ((schema as OpenAPIV3_1.Document)[component] || {}) as NonNullable<typeof schema.paths>;
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
