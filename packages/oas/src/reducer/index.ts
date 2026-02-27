import type { ComponentsObject, HttpMethods, OASDocument, OperationObject, TagObject } from '../types.js';

import jsonPointer from 'jsonpointer';

import { query } from '../analyzer/util.js';
import { decodePointer } from '../lib/refs.js';

interface ReducerOptions {
  /** A key-value object of path + method combinations to reduce by. */
  paths?: Record<string, string[] | '*'>;
  /** An array of tags in the OpenAPI definition to reduce by. */
  tags?: string[];
}

/**
 * Query a JSON Schema object for any `$ref` pointers using JSONPath and return any pointers that
 * exist.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9535}
 * @param schema JSON Schema object to look for any `$ref` pointers within it.
 */
function queryForRefPointers(schema: any) {
  return query(["$..['$ref']"], schema);
}

/**
 * Normalize a value from a `jsonpath-plus` `$ref` query to a `$ref` pointer because JSONPath
 * queries may return the property value or the parent.
 *
 */
function toRefString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  } else if (value && typeof value === 'object' && '$ref' in value && typeof value.$ref === 'string') {
    return value.$ref;
  }

  return null;
}

/**
 * If the given `$ref` points into a path (e.g. `#/paths/~1anything/post/...`), return the path and
 * method so the reducer can ultimately retain cross-operation references.
 *
 */
function parsePathRef($ref: string): { path: string; method: string } | null {
  if (typeof $ref !== 'string' || !$ref.startsWith('#/paths/')) {
    return null;
  }

  // Extract path segment and method: `#/paths/<pathSegment>/<method>/...`
  const match = $ref.match(/^#\/paths\/([^/]+)\/([^/]+)(?:\/|$)/);
  if (match) {
    const pathSegment = match[1];
    const method = match[2];
    if (pathSegment && method) {
      return { path: decodePointer(pathSegment), method };
    }
  }

  return null;
}

/**
 * Recursively process a `$ref` pointer and accumulate any other `$ref` pointers that it or its
 * children use. This handles circular references by skipping `$ref` pointers we have already seen.
 * Additionally when a `$ref` points to `#/paths` we record the used path + method so we can
 * retain cross-operation references within the reduced definition.
 *
 * @param schema JSON Schema object to look for and accumulate any `$ref` pointers that it may have.
 * @param $refs Known set of `$ref` pointers.
 * @param $ref `$ref` pointer to fetch a schema from out of the supplied schema.
 * @param retainPathMethods Optional set to which we add `pathLC|methodLC` for any `$ref` that points into a path.
 */
function accumulateUsedRefs(
  schema: Record<string, unknown>,
  $refs: Set<string>,
  $ref: string,
  retainPathMethods?: Set<string>,
): void {
  // Record `$ref` pointers aimed at `#/paths` so we can retain any cross-operation references.
  const pathRef = parsePathRef($ref);
  if (pathRef && retainPathMethods) {
    retainPathMethods.add(`${pathRef.path.toLowerCase()}|${pathRef.method.toLowerCase()}`);
  }

  let $refSchema: unknown;
  if (typeof $ref === 'string') $refSchema = jsonPointer.get(schema, $ref.substring(1));
  if ($refSchema === undefined) {
    // If the schema we have wasn't fully dereferenced or bundled for whatever reason and this
    // `$ref` that we have doesn't exist here we shouldn't try to search for more `$ref` pointers
    // in a schema that doesn't exist.
    return;
  }

  queryForRefPointers($refSchema).forEach(({ value: currRef }) => {
    // Because it's possible to have a schema property named `$ref` that is not a `$ref` pointer,
    // which our JSONPath query would pick up as a false positive, we want to exclude that from
    // `$ref` matching as it's not a reference pointer.
    const foundRef = toRefString(currRef);
    if (!foundRef) {
      return;
    }

    // If we've already processed this `$ref` then don't send us into an infinite loop of processing
    // circular references.
    if ($refs.has(foundRef)) {
      return;
    }

    $refs.add(foundRef);
    accumulateUsedRefs(schema, $refs, foundRef, retainPathMethods);
  });
}

/**
 * With an array of tags or object of paths+method combinations, reduce an OpenAPI definition to a
 * new definition that just contains those tags or path + methods.
 *
 * @example <caption>Reduce by an array of tags only.</caption>
 * reducer(apiDefinition, { tags: ['pet'] })
 *
 * @example <caption>Reduce by a specific path and methods.</caption>
 * reducer(apiDefinition, { paths: { '/pet': ['get', 'post'] } })
 *
 * @example <caption>Reduce by a specific path and all methods it has.</caption>
 * reducer(apiDefinition, { paths: { '/pet': '*' } })
 *
 * @param definition A valid OpenAPI 3.x definition
 */
// biome-ignore lint/style/noDefaultExport: This is safe for now.
export default function reducer(definition: OASDocument, opts: ReducerOptions = {}): OASDocument {
  if (!definition.openapi) {
    throw new Error('Sorry, only OpenAPI definitions are supported.');
  }

  /**
   * OpenAPI 3.1 introduced support for `webhooks` but the reducer does not yet support reducing
   * definitions that contain them.
   * @todo
   */
  if (!definition.openapi.startsWith('3.0')) {
    if ('webhooks' in definition) {
      return definition;
    }
  }

  const reduced: OASDocument = structuredClone(definition);
  const $refs: Set<string> = new Set();
  const usedTags: Set<string> = new Set();
  const retainPathMethods: Set<`${string}|${string}`> = new Set();

  // Convert tags and paths to lowercase since casing should not matter.
  const reduceTags = (opts?.tags || []).map(tag => tag.toLowerCase());
  const reducePaths = Object.entries(opts?.paths || {}).reduce(
    (acc: Record<string, string[] | string>, [key, value]) => {
      const newKey = key.toLowerCase();
      const newValue = Array.isArray(value) ? value.map(v => v.toLowerCase()) : value.toLowerCase();
      acc[newKey] = newValue;
      return acc;
    },
    {},
  );

  // Retain any root-level security definitions, regardless if they're used or not on our reduced
  // operations.
  if ('security' in reduced) {
    Object.values(reduced.security || {}).forEach(sec => {
      Object.keys(sec).forEach(scheme => {
        $refs.add(`#/components/securitySchemes/${scheme}`);
      });
    });
  }

  if ('paths' in reduced) {
    Object.keys(reduced.paths || {}).forEach(path => {
      const pathLC = path.toLowerCase();

      if (Object.keys(reducePaths).length) {
        if (!(pathLC in reducePaths)) {
          delete reduced.paths?.[path];
          return;
        }
      }

      Object.keys(reduced.paths?.[path] || {}).forEach(method => {
        // Operation-level common parameters are defined with a `parameters` property that we
        // should always preserve.
        if (method === 'parameters') {
          return;
        }

        if (Object.keys(reducePaths).length) {
          // If we have paths we want to reduce but this isn't part of our filter set, then ignore.
          // We'll remove it later.
          if (
            reducePaths[pathLC] !== '*' &&
            Array.isArray(reducePaths[pathLC]) &&
            !reducePaths[pathLC].includes(method)
          ) {
            return;
          }
        }

        const operation = reduced.paths?.[path]?.[method as HttpMethods] as OperationObject;
        if (!operation) {
          throw new Error(`Operation \`${method} ${path}\` not found`);
        }

        if (reduceTags.length) {
          // If this endpoint either has no tags or none that we want to preseve, then prune it.
          if (!(operation.tags || []).filter(tag => reduceTags.includes(tag.toLowerCase())).length) {
            return;
          }
        }

        (operation.tags || []).forEach((tag: string) => {
          usedTags.add(tag);
        });

        queryForRefPointers(operation).forEach(({ value: ref }) => {
          const refStr = toRefString(ref);
          if (!refStr) {
            return;
          }

          $refs.add(refStr);

          // If this operation has a cross-operation `$ref` pointer then we need to track it so
          // it's retained.
          const pathRef = parsePathRef(refStr);
          if (pathRef) {
            retainPathMethods.add(`${pathRef.path.toLowerCase()}|${pathRef.method.toLowerCase()}`);
          }

          // Re-run through any `$ref` pointers that we found within this operation and search for
          // any `$ref` pointers that they also may be using.
          accumulateUsedRefs(reduced, $refs, refStr, retainPathMethods);
        });

        Object.values(operation.security || {}).forEach(sec => {
          Object.keys(sec).forEach(scheme => {
            $refs.add(`#/components/securitySchemes/${scheme}`);
          });
        });
      });
    });

    // Recursively accumulate any components that are in use.
    $refs.forEach($ref => {
      accumulateUsedRefs(reduced, $refs, $ref, retainPathMethods);
    });

    $refs.forEach(ref => {
      const usedPathRef = parsePathRef(ref);
      if (usedPathRef) {
        retainPathMethods.add(`${usedPathRef.path.toLowerCase()}|${usedPathRef.method.toLowerCase()}`);
      }
    });

    Object.keys(reduced.paths || {}).forEach(path => {
      const pathLC = path.toLowerCase();

      if (Object.keys(reducePaths).length && !(pathLC in reducePaths)) {
        delete reduced.paths?.[path];
        return;
      }

      Object.keys(reduced.paths?.[path] || {}).forEach(method => {
        const methodLC = method.toLowerCase();
        const retainedByRef =
          method === 'parameters' ||
          retainPathMethods.has(`${pathLC}|${methodLC}`) ||
          Array.from($refs).some(ref => {
            const pathRef = parsePathRef(ref);
            return pathRef?.path.toLowerCase() === pathLC && pathRef?.method.toLowerCase() === methodLC;
          });

        if (method !== 'parameters') {
          // If we're reducing paths and this operation isn't part of our filter set, and it's not
          // a cross-referenced operation that we want to retain, then we should prune it.
          if (Object.keys(reducePaths).length) {
            if (
              !retainedByRef &&
              reducePaths[pathLC] !== '*' &&
              Array.isArray(reducePaths[pathLC]) &&
              !reducePaths[pathLC].includes(method)
            ) {
              delete reduced.paths?.[path]?.[method as HttpMethods];
              return;
            }
          }
        }

        const operation = reduced.paths?.[path]?.[method as HttpMethods];
        if (!operation) {
          throw new Error(`Operation \`${method} ${path}\` not found`);
        }

        // If we're reducing by tags and this operation doesn't live in one of those, remove it.
        if (reduceTags.length) {
          // If this operation doesn't have any tags that we want to preserve, and it isn't
          // cross-referenced from an operation we _do_ want to preserve, then remove it.
          if (!(operation.tags || []).filter(tag => reduceTags.includes(tag.toLowerCase())).length) {
            if (!retainedByRef) {
              delete reduced.paths?.[path]?.[method as HttpMethods];
            }

            return;
          }
        }

        // Accumulate a list of used tags so we can filter out any ones that we don't need later.
        if ('tags' in operation) {
          operation.tags?.forEach((tag: string) => {
            usedTags.add(tag);
          });
        }

        // Accumulate any used operation-level security schemas that we need to retain.
        if ('security' in operation) {
          Object.values(operation.security || {}).forEach(sec => {
            Object.keys(sec).forEach(scheme => {
              $refs.add(`#/components/securitySchemes/${scheme}`);
            });
          });
        }
      });

      // If this path no longer has any methods, delete it.
      if (!Object.keys(reduced.paths?.[path] || {}).length) {
        delete reduced.paths?.[path];
      }
    });

    // If we don't have any more paths after cleanup, throw an error because an OpenAPI file must
    // have at least one path.
    if (!Object.keys(reduced.paths || {}).length) {
      throw new Error('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
    }
  }

  // Remove any unused components.
  if ('components' in reduced) {
    Object.keys(reduced.components || {}).forEach(componentType => {
      Object.keys(reduced.components?.[componentType as keyof ComponentsObject] || {}).forEach(component => {
        // If our `$ref` either is a full, or deep match, then we should preserve it.
        const refIsUsed =
          $refs.has(`#/components/${componentType}/${component}`) ||
          Array.from($refs).some(ref => {
            // Because you can have a `$ref` like `#/components/examples/event-min/value`, which
            // would be accumulated via our `$refs` query, we want to make sure we account for them.
            // If we don't look for these then we'll end up removing them from the overall reduced
            // definition, resulting in data loss and schema corruption.
            return ref.startsWith(`#/components/${componentType}/${component}/`);
          });

        if (!refIsUsed) {
          delete reduced.components?.[componentType as keyof ComponentsObject]?.[component];
        }
      });

      // If this component group is now empty, delete it.
      if (!Object.keys(reduced.components?.[componentType as keyof ComponentsObject] || {}).length) {
        delete reduced.components?.[componentType as keyof ComponentsObject];
      }
    });

    // If this path no longer has any components, delete it.
    if (!Object.keys(reduced.components || {}).length) {
      delete reduced.components;
    }
  }

  // Remove any unused tags.
  if ('tags' in reduced) {
    reduced.tags?.forEach((tag: TagObject, k: number) => {
      if (!usedTags.has(tag.name)) {
        delete reduced.tags?.[k];
      }
    });

    // Remove any now empty items from the tags array.
    reduced.tags = reduced.tags?.filter(Boolean);

    if (!reduced.tags?.length) {
      delete reduced.tags;
    }
  }

  return reduced;
}
