import type { OASDocument } from '../types.js';

import jsonPointer from 'jsonpointer';

import { collectRefsInSchema, encodePointer } from '../lib/refs.js';
import { supportedMethods } from '../utils.js';

/**
 * The set of JSON pointers (in plain `/foo/bar` form, without the leading `#`) that describe
 * everything an operation or webhook touches: itself, any path-level (or webhook-level) common
 * parameters, and every `$ref` pointer that's reachable from either of those.
 *
 * This is what allows the analyzer to be run against a full, undreduced API definition and still
 * only report on what a single operation actually uses.
 */
export interface OperationScope {
  /**
   * `anchors`, each with a trailing `/` appended, precomputed once so `isPointerInScope()` isn't
   * concatenating a new string per anchor on every single pointer it checks. Analyzing an
   * operation can mean checking thousands of result pointers against this list, so avoiding a
   * string allocation per comparison meaningfully adds up.
   */
  anchorPrefixes: string[];

  /**
   * A flattened, precomputed list of every pointer prefix that's considered "in scope". This is
   * derived from `rootPointer`, `extraPointers`, and `reachableRefs` and exists purely so we don't
   * have to rebuild it for every pointer comparison we do.
   */
  anchors: string[];

  /**
   * Pointers, beyond `rootPointer`, that should be treated as belonging to this operation (e.g. a
   * path item's common `parameters`).
   */
  extraPointers: string[];

  /**
   * Every `$ref` pointer (in `#/...` form) that's transitively reachable from this operation.
   */
  reachableRefs: Set<string>;

  /**
   * The pointer to the operation (or webhook operation) itself, e.g. `/paths/~1pet/get` or
   * `/webhooks/newBooking/post`.
   */
  rootPointer: string;
}

/**
 * Normalize a `$ref` pointer (`#/components/schemas/Pet`) into a plain JSON pointer
 * (`/components/schemas/Pet`) so it can be compared against `jsonpath-plus` result pointers, which
 * never carry the leading `#`.
 *
 */
export function toPointer($ref: string): string {
  return $ref.startsWith('#') ? $ref.slice(1) : $ref;
}

/**
 * Case-insensitively find the real key for a given target within a list of keys. OpenAPI paths and
 * HTTP methods aren't case-sensitive as far as most tooling (including this) is concerned, but the
 * pointers we build need to match the casing that's actually in the document.
 *
 */
function resolveKey(keys: string[], target: string): string | undefined {
  return keys.find(key => key === target) || keys.find(key => key.toLowerCase() === target.toLowerCase());
}

/**
 * Starting from a seed set of `$ref` pointers, recursively follow every `$ref` that they, or
 * anything they point to, contain and return the full set of pointers that are reachable.
 *
 * This intentionally mirrors the ref-walking that `OpenAPIReducer` does, but is read-only (no
 * cloning, no mutation) and resolves each `$ref` lazily against the original definition instead of
 * requiring a prebuilt map of every possible reference.
 *
 * @param definition The API definition to resolve `$ref` pointers against.
 * @param seeds The `$ref` pointers to start walking from.
 */
function accumulateReachableRefs(definition: OASDocument, seeds: Iterable<string>): Set<string> {
  const reachable = new Set<string>();
  const queue = [...seeds];

  while (queue.length) {
    const ref = queue.shift() as string;
    if (reachable.has(ref)) {
      continue;
    }

    reachable.add(ref);

    let resolved: unknown;
    try {
      resolved = jsonPointer.get(definition, toPointer(ref));
    } catch {
      // If the `$ref` doesn't resolve to anything (a malformed pointer, an external ref we didn't
      // bundle, etc.) there's nothing further to walk from it.
      continue;
    }

    if (resolved === undefined) {
      continue;
    }

    collectRefsInSchema(resolved).forEach(nestedRef => {
      if (!reachable.has(nestedRef)) {
        queue.push(nestedRef);
      }
    });
  }

  return reachable;
}

function buildAnchors(
  rootPointer: string,
  extraPointers: string[],
  reachableRefs: Set<string>,
): Pick<OperationScope, 'anchorPrefixes' | 'anchors'> {
  const anchors = [rootPointer, ...extraPointers];
  reachableRefs.forEach(ref => anchors.push(toPointer(ref)));

  return { anchors, anchorPrefixes: anchors.map(anchor => `${anchor}/`) };
}

/**
 * Accumulate the `#/components/securitySchemes/*` refs that a given set of security requirements
 * make use of.
 *
 */
function collectSecuritySchemeRefs(security: unknown): string[] {
  if (!Array.isArray(security)) {
    return [];
  }

  const refs: string[] = [];
  security.forEach(requirement => {
    if (requirement && typeof requirement === 'object') {
      Object.keys(requirement).forEach(scheme => {
        refs.push(`#/components/securitySchemes/${scheme}`);
      });
    }
  });

  return refs;
}

/**
 * Compute the `OperationScope` for a single operation within an API definition, so that the
 * analyzer can report only on what that operation (and anything it references) actually uses,
 * without requiring the definition to be reduced down first.
 *
 * @param definition The API definition that the operation lives within.
 * @param path The path that the operation is a part of.
 * @param method The HTTP method of the operation.
 */
export function computeOperationScope(definition: OASDocument, path: string, method: string): OperationScope {
  const pathKey = resolveKey(Object.keys(definition.paths || {}), path);
  if (!pathKey) {
    throw new Error(`Path \`${path}\` not found.`);
  }

  const pathItem = (definition.paths as Record<string, any>)[pathKey] || {};
  const methodKey = resolveKey(Object.keys(pathItem), method);
  if (!methodKey || !supportedMethods.includes(methodKey.toLowerCase() as (typeof supportedMethods)[number])) {
    throw new Error(`Operation \`${method} ${path}\` not found.`);
  }

  const operation = pathItem[methodKey];
  const rootPointer = `/paths/${encodePointer(pathKey)}/${methodKey}`;
  const extraPointers: string[] = [];
  const seeds = new Set<string>(collectRefsInSchema(operation));

  if (pathItem.parameters) {
    extraPointers.push(`/paths/${encodePointer(pathKey)}/parameters`);
    collectRefsInSchema(pathItem.parameters).forEach(ref => seeds.add(ref));
  }

  const security = 'security' in operation ? operation.security : definition.security;
  collectSecuritySchemeRefs(security).forEach(ref => seeds.add(ref));

  const reachableRefs = accumulateReachableRefs(definition, seeds);

  return { rootPointer, extraPointers, reachableRefs, ...buildAnchors(rootPointer, extraPointers, reachableRefs) };
}

/**
 * Compute the `OperationScope` for a single webhook operation within an OpenAPI 3.1 definition.
 *
 * @param definition The API definition that the webhook lives within.
 * @param webhookName The name of the webhook.
 * @param method The HTTP method of the webhook operation.
 */
export function computeWebhookScope(definition: OASDocument, webhookName: string, method: string): OperationScope {
  const webhooks = ('webhooks' in definition ? definition.webhooks : undefined) as Record<string, any> | undefined;
  const webhookKey = resolveKey(Object.keys(webhooks || {}), webhookName);
  if (!webhookKey) {
    throw new Error(`Webhook \`${webhookName}\` not found.`);
  }

  const webhook = (webhooks as Record<string, any>)[webhookKey] || {};
  const methodKey = resolveKey(Object.keys(webhook), method);
  if (!methodKey || !supportedMethods.includes(methodKey.toLowerCase() as (typeof supportedMethods)[number])) {
    throw new Error(`Webhook operation \`${method} ${webhookName}\` not found.`);
  }

  const operation = webhook[methodKey];
  const rootPointer = `/webhooks/${encodePointer(webhookKey)}/${methodKey}`;
  const extraPointers: string[] = [];
  const seeds = new Set<string>(collectRefsInSchema(operation));

  if (webhook.parameters) {
    extraPointers.push(`/webhooks/${encodePointer(webhookKey)}/parameters`);
    collectRefsInSchema(webhook.parameters).forEach(ref => seeds.add(ref));
  }

  const security = 'security' in operation ? operation.security : definition.security;
  collectSecuritySchemeRefs(security).forEach(ref => seeds.add(ref));

  const reachableRefs = accumulateReachableRefs(definition, seeds);

  return { rootPointer, extraPointers, reachableRefs, ...buildAnchors(rootPointer, extraPointers, reachableRefs) };
}

/**
 * Determine if a given JSON pointer (as returned by `jsonpath-plus`, without a leading `#`) falls
 * within a given `OperationScope`.
 *
 */
export function isPointerInScope(pointer: string, scope: OperationScope): boolean {
  const { anchors, anchorPrefixes } = scope;
  for (let i = 0; i < anchors.length; i += 1) {
    if (pointer === anchors[i] || pointer.startsWith(anchorPrefixes[i])) {
      return true;
    }
  }

  return false;
}

/**
 * Determine if a given `OperationScope`'s root is nested *within* a given pointer. This is the
 * inverse of `isPointerInScope()` and exists for the handful of queries (like our `webhooks` one)
 * that report on a coarser pointer than the specific operation we're scoped to, e.g. reporting on
 * `/webhooks/newBooking` as a whole when we're scoped to `/webhooks/newBooking/post`.
 *
 */
export function isAncestorOfScope(pointer: string, scope: OperationScope): boolean {
  return scope.rootPointer === pointer || scope.rootPointer.startsWith(`${pointer}/`);
}

/**
 * Estimate, in bytes, the size of everything that a given `OperationScope` touches within a JSON
 * object. This purposefully does not build a fully valid, standalone OpenAPI definition (that's
 * what `OpenAPIReducer` is for) — it's a fast approximation used to give a rough sense of how much
 * of the definition a single operation is pulling in.
 *
 * A large, shared component (a big `Envelope` schema, say) can be reachable from hundreds of
 * operations. Without caching, analyzing all of them would mean re-stringifying that same schema
 * hundreds of times over. We memoize the size of each pointer against the `root` object it was
 * computed from, so shared components are only ever serialized once no matter how many operations'
 * scopes reach them.
 *
 */
export function estimateScopedSize(root: unknown, scope: OperationScope): number {
  let sizeByPointer = scopedSizeCache.get(root as object);
  if (!sizeByPointer) {
    sizeByPointer = new Map();
    scopedSizeCache.set(root as object, sizeByPointer);
  }

  const seen = new Set<string>();
  let bytes = 0;

  scope.anchors.forEach(pointer => {
    if (seen.has(pointer)) {
      return;
    }

    seen.add(pointer);

    let size = sizeByPointer.get(pointer);
    if (size === undefined) {
      size = 0;

      let value: unknown;
      try {
        value = jsonPointer.get(root as object, pointer);
      } catch {
        value = undefined;
      }

      if (value !== undefined) {
        try {
          size = Buffer.byteLength(JSON.stringify(value));
        } catch {
          // Circular or otherwise unstringifiable; treat it as zero rather than fail the estimate.
        }
      }

      sizeByPointer.set(pointer, size);
    }

    bytes += size;
  });

  return bytes;
}

const scopedSizeCache = new WeakMap<object, Map<string, number>>();
