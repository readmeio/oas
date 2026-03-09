import type { OpenAPIV3_1 } from 'openapi-types';
import type { ComponentsObject, HttpMethods, OASDocument, OperationObject, TagObject } from '../types.js';

import jsonPointer from 'jsonpointer';

import { query } from '../analyzer/util.js';
import { decodePointer } from '../lib/refs.js';
import { isOpenAPI31, isRef } from '../types.js';
import { supportedMethods } from '../utils.js';

export class OpenAPIReducer {
  private definition: OASDocument;

  /**
   * A collection of `$ref` pointers that are used within our reduced API definition. This is used
   * to ensure that all referenced schemas are retained in our resulting API definition. Not
   * retaining them would result in an invalid OpenAPI definition.
   */
  private $refs: Set<string> = new Set();

  /**
   * A collection of OpenAPI tags that are used within our reduced API definition.
   */
  private usedTags: Set<string> = new Set();

  /**
   * A collection of OpenAPI paths and operations that are cross-referenced from any other paths
   * and operations that we are reducing. This collection is used in order to ensure that those
   * schemas are retained with our resulting API definition. Not retaining them would result in an
   * invalid OpenAPI definition.
   */
  private retainPathMethods: Set<`${string}|${string}`> = new Set();

  /**
   * A collection of OpenAPI webhook names and methods that are cross-referenced from any other
   * schemas. This collection, like `retainPathMethods`, is used in order to ensure that those
   * schemas are retained with our resulting API definition. Not retaining them would result in an
   * invalid OpenAPI definition.
   */
  private retainWebhookMethods: Set<`${string}|${string}`> = new Set();

  /**
   * An array of OpenAPI tags to reduce down to.
   */
  private tagsToReduceBy: string[] = [];

  /**
   * A collection of OpenAPI paths and operations to reduce down to.
   */
  private pathsToReduceBy: Record<string, '*' | string[]> = {};

  /**
   * A collection of OpenAPI webhooks to reduce down to.
   */
  private webhooksToReduceBy: Record<string, '*' | string[]> = {};

  private hasTagsToReduceBy: boolean = false;
  private hasPathsToReduceBy: boolean = false;
  private hasWebhooksToReduceBy: boolean = false;

  private constructor(definition: OASDocument) {
    this.definition = structuredClone(definition);
  }

  /**
   * Initialize a new instance of the `OpenAPIReducer`. The reducer allows you to reduce an OpenAPI
   * definition down to only the information necessary to fulfill a specific set of tags, paths,
   * operations, and webhooks.
   *
   * OpenAPI reduction can be helpful not only to isolate and troubleshoot issues with large API
   * definitions, but also to compress a large API definition down to a manageable size containing
   * a specific set of items.
   *
   * All OpenAPI definitions reduced will still be fully functional and valid OpenAPI definitions.
   *
   * @param definition An OpenAPI definition to reduce.
   */
  static init(definition: OASDocument): OpenAPIReducer {
    return new OpenAPIReducer(definition);
  }

  /**
   * Mark an OpenAPI tag to be included in our reduced API definition. Tag casing does not matter.
   *
   * @param tag The tag to mark for reduction.
   */
  byTag(tag: string): OpenAPIReducer {
    this.tagsToReduceBy.push(tag.toLowerCase());
    return this;
  }

  /**
   * Mark an entire OpenAPI path, and all methods that it contains, to be included in your reduced
   * API definition. Path casing does not matter.
   *
   * @param path The path to mark for reduction.
   */
  byPath(path: string): OpenAPIReducer {
    this.pathsToReduceBy[path.toLowerCase()] = '*';
    return this;
  }

  /**
   * Mark a single OpenAPI operation to be included in your reduced API definition. If the path
   * that this operation is a part of utilizes common parameters, those will be automatically
   * included. Path and method casing does not matter.
   *
   * Note that if you previously called `.byPath()` to reduce an entire path down, calling
   * `.byOperation()` will override that to just reduce this specific method (or this plus
   * subsequent calls to `.byOperation()`).
   *
   * @param path The path that the operation is a part of.
   * @param method The HTTP method of the operation to mark for reduction.
   *
   */
  byOperation(path: string, method: string): OpenAPIReducer {
    const pathLC = path.toLowerCase(); // Casing should not matter.
    const methodLC = method.toLowerCase();

    if (this.pathsToReduceBy[pathLC] && Array.isArray(this.pathsToReduceBy[pathLC])) {
      this.pathsToReduceBy[pathLC].push(methodLC);
    } else {
      this.pathsToReduceBy[pathLC] = [methodLC];
    }

    return this;
  }

  /**
   * Mark an OpenAPI webhook (and all of its operations) to be included in your reduced API
   * definition. Casing does not matter.
   *
   * @param webhookName The webhook name to mark for reduction.
   */
  byWebhook(webhookName: string): OpenAPIReducer;

  /**
   * Mark a single OpenAPI webhook operation to be included in your reduced API definition.
   * Casing does not matter.
   *
   * @param webhookName The webhook name that the operation belongs to.
   * @param method The HTTP method of the webhook operation to mark for reduction.
   */
  byWebhook(webhookName: string, method: string): OpenAPIReducer;

  byWebhook(webhookName: string, method?: string): OpenAPIReducer {
    const nameLC = webhookName.toLowerCase();
    if (!method) {
      this.webhooksToReduceBy[nameLC] = '*';
      return this;
    }

    const methodLC = method.toLowerCase();
    if (this.webhooksToReduceBy[nameLC] && Array.isArray(this.webhooksToReduceBy[nameLC])) {
      this.webhooksToReduceBy[nameLC].push(methodLC);
    } else {
      this.webhooksToReduceBy[nameLC] = [methodLC];
    }

    return this;
  }

  /**
   * Reduce the current OpenAPI definition down to the configured filters.
   *
   */
  reduce(): OASDocument {
    if (!this.definition.openapi) {
      throw new Error('Sorry, only OpenAPI definitions are supported.');
    }

    this.hasPathsToReduceBy = Boolean(Object.keys(this.pathsToReduceBy).length);
    this.hasWebhooksToReduceBy = Boolean(Object.keys(this.webhooksToReduceBy).length);
    this.hasTagsToReduceBy = Boolean(this.tagsToReduceBy.length);

    // Retain any root-level security definitions, regardless if they're used or not on our reduced
    // operations.
    if ('security' in this.definition) {
      Object.values(this.definition.security || {}).forEach(sec => {
        Object.keys(sec).forEach(scheme => {
          this.$refs.add(`#/components/securitySchemes/${scheme}`);
        });
      });
    }

    this.walkPaths();
    this.walkWebhooks();

    // Recursively accumulate any components that are in use.
    this.$refs.forEach($ref => {
      this.accumulateUsedRefs(this.definition, this.$refs, $ref);
    });

    this.$refs.forEach(ref => {
      const usedPathRef = this.parsePathRef(ref);
      if (usedPathRef) {
        this.retainPathMethods.add(`${usedPathRef.path.toLowerCase()}|${usedPathRef.method.toLowerCase()}`);
      }

      const usedWebhookRef = this.parseWebhookRef(ref);
      if (usedWebhookRef) {
        this.retainWebhookMethods.add(`${usedWebhookRef.name.toLowerCase()}|${usedWebhookRef.method.toLowerCase()}`);
      }
    });

    this.reducePaths();
    this.reduceWebhooks();

    // Require at least one path or one webhook in the result.
    const hasPaths = Boolean(this.definition.paths && Object.keys(this.definition.paths).length);
    const hasWebhooks = Boolean(
      'webhooks' in this.definition && this.definition.webhooks && Object.keys(this.definition.webhooks).length,
    );

    if (!hasPaths && !hasWebhooks) {
      throw new Error(
        'All paths and webhooks in the API definition were removed. Did you supply the right path, operation, or webhook to reduce by?',
      );
    }

    // Remove any unused components.
    if ('components' in this.definition) {
      Object.keys(this.definition.components || {}).forEach(componentType => {
        Object.keys(this.definition.components?.[componentType as keyof ComponentsObject] || {}).forEach(component => {
          // If our `$ref` either is a full, or deep match, then we should preserve it.
          const refIsUsed =
            this.$refs.has(`#/components/${componentType}/${component}`) ||
            Array.from(this.$refs).some(ref => {
              // Because you can have a `$ref` like `#/components/examples/event-min/value`, which
              // would be accumulated via our `$refs` query, we want to make sure we account for them.
              // If we don't look for these then we'll end up removing them from the overall reduced
              // definition, resulting in data loss and schema corruption.
              return ref.startsWith(`#/components/${componentType}/${component}/`);
            });

          if (!refIsUsed) {
            delete this.definition.components?.[componentType as keyof ComponentsObject]?.[component];
          }
        });

        // If this component group is now empty, delete it.
        if (!Object.keys(this.definition.components?.[componentType as keyof ComponentsObject] || {}).length) {
          delete this.definition.components?.[componentType as keyof ComponentsObject];
        }
      });

      // If this path no longer has any components, delete it.
      if (!Object.keys(this.definition.components || {}).length) {
        delete this.definition.components;
      }
    }

    // Remove any unused tags.
    if ('tags' in this.definition) {
      this.definition.tags = (this.definition.tags ?? []).filter((tag): tag is TagObject => {
        return Boolean(tag) && this.usedTags.has(tag.name);
      });

      if (!this.definition.tags?.length) {
        delete this.definition.tags;
      }
    }

    return this.definition;
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
   */
  private accumulateUsedRefs(schema: Record<string, unknown>, $refs: Set<string>, $ref: string): void {
    // Record `$ref` pointers aimed at `#/paths` so we can retain any cross-operation references.
    const pathRef = this.parsePathRef($ref);
    if (pathRef) {
      this.retainPathMethods.add(`${pathRef.path.toLowerCase()}|${pathRef.method.toLowerCase()}`);
    }

    const webhookRef = this.parseWebhookRef($ref);
    if (webhookRef) {
      this.retainWebhookMethods.add(`${webhookRef.name.toLowerCase()}|${webhookRef.method.toLowerCase()}`);
    }

    let $refSchema: unknown;
    if (typeof $ref === 'string') $refSchema = jsonPointer.get(schema, $ref.substring(1));
    if ($refSchema === undefined) {
      // If the schema we have wasn't fully dereferenced or bundled for whatever reason and this
      // `$ref` that we have doesn't exist here we shouldn't try to search for more `$ref` pointers
      // in a schema that doesn't exist.
      return;
    }

    this.queryForRefPointers($refSchema).forEach(({ value: currRef }) => {
      // Because it's possible to have a schema property named `$ref` that is not a `$ref` pointer,
      // which our JSONPath query would pick up as a false positive, we want to exclude that from
      // `$ref` matching as it's not a reference pointer.
      const foundRef = this.toRefString(currRef);
      if (!foundRef) {
        return;
      }

      // If we've already processed this `$ref` then don't send us into an infinite loop of processing
      // circular references.
      if ($refs.has(foundRef)) {
        return;
      }

      $refs.add(foundRef);
      this.accumulateUsedRefs(schema, $refs, foundRef);
    });
  }

  /**
   * Query a JSON Schema object for any `$ref` pointers using JSONPath and return any pointers that
   * exist.
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc9535}
   * @param schema JSON Schema object to look for any `$ref` pointers within it.
   */
  private queryForRefPointers(schema: any) {
    return query(["$..['$ref']"], schema);
  }

  /**
   * Normalize a value from a `jsonpath-plus` `$ref` query to a `$ref` pointer because JSONPath
   * queries may return the property value or the parent.
   *
   */
  private toRefString(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    } else if (value && typeof value === 'object' && '$ref' in value && typeof value.$ref === 'string') {
      return value.$ref;
    }

    return null;
  }

  /**
   * If the given `$ref` points into a path (e.g. `#/paths/~1anything/post/...`), return the path
   * and method so the reducer can ultimately retain cross-operation references.
   *
   */
  private parsePathRef($ref: string): { path: string; method: string } | null {
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
   * If the given `$ref` points into webhooks (e.g. `#/webhooks/newBooking/post/...`), return the
   * webhook name and method so the reducer can retain cross-referenced webhook operations.
   *
   */
  private parseWebhookRef($ref: string): { name: string; method: string } | null {
    if (typeof $ref !== 'string' || !$ref.startsWith('#/webhooks/')) {
      return null;
    }

    // Extract path segment and method: `#/webhooks/<webhookName>/<method>/...`
    const match = $ref.match(/^#\/webhooks\/([^/]+)\/([^/]+)(?:\/|$)/);
    if (match) {
      const webhookName = match[1];
      const method = match[2];
      if (webhookName && method) {
        return { name: decodePointer(webhookName), method };
      }
    }

    return null;
  }

  /**
   * Walk through the `paths` in our OpenAPI definition and reduce down any that we know we do not
   * want to keep and accumulate any `$ref` pointers that we find that may be cross-referenced in
   * paths, webhooks, operations, and schemas that we _do_ want to keep.
   *
   */
  private walkPaths(): void {
    if (!('paths' in this.definition) || !this.definition.paths) {
      return;
    }

    Object.keys(this.definition.paths).forEach(path => {
      const pathLC = path.toLowerCase();

      // When only webhooks were requested (no path/operation filter), remove all paths.
      if (this.hasWebhooksToReduceBy && !this.hasPathsToReduceBy) {
        delete this.definition.paths?.[path];
        return;
      }

      if (this.hasPathsToReduceBy) {
        if (!(pathLC in this.pathsToReduceBy)) {
          delete this.definition.paths?.[path];
          return;
        }
      }

      Object.keys(this.definition.paths?.[path] || {}).forEach(method => {
        // Only process operations and retain any common path-level common properties like
        // `parameters`, `servers`, `summary`, etc.
        if (method === 'parameters' || !supportedMethods.includes(method.toLowerCase() as HttpMethods)) {
          return;
        }

        if (this.hasPathsToReduceBy) {
          // If we have paths we want to reduce but this isn't part of our filter set, then ignore.
          // We'll remove it later.
          if (
            this.pathsToReduceBy[pathLC] !== '*' &&
            Array.isArray(this.pathsToReduceBy[pathLC]) &&
            !this.pathsToReduceBy[pathLC].includes(method.toLowerCase())
          ) {
            return;
          }
        }

        const operation = this.definition.paths?.[path]?.[method as HttpMethods] as OperationObject;
        if (!operation) {
          throw new Error(`Operation \`${method} ${path}\` not found`);
        }

        if (this.hasTagsToReduceBy) {
          // If this endpoint either has no tags or none that we want to preseve, then prune it.
          if (!(operation.tags || []).filter(tag => this.tagsToReduceBy.includes(tag.toLowerCase())).length) {
            return;
          }
        }

        (operation.tags || []).forEach((tag: string) => {
          this.usedTags.add(tag);
        });

        this.queryForRefPointers(operation).forEach(({ value: ref }) => {
          const refStr = this.toRefString(ref);
          if (!refStr) {
            return;
          }

          this.$refs.add(refStr);

          // If this operation has a cross-operation `$ref` pointer then we need to track it so
          // it's retained.
          const pathRef = this.parsePathRef(refStr);
          if (pathRef) {
            this.retainPathMethods.add(`${pathRef.path.toLowerCase()}|${pathRef.method.toLowerCase()}`);
          }

          // Re-run through any `$ref` pointers that we found within this operation and search for
          // any `$ref` pointers that they also may be using.
          this.accumulateUsedRefs(this.definition, this.$refs, refStr);
        });

        Object.values(operation.security || {}).forEach(sec => {
          Object.keys(sec).forEach(scheme => {
            this.$refs.add(`#/components/securitySchemes/${scheme}`);
          });
        });
      });
    });
  }

  /**
   * Walk through the `webhooks` in our OpenAPI definition and reduce down any that we know we do
   * not want to keep and accumulate any `$ref` pointers that we find that may be cross-referenced
   * in paths, operations, and schemas that we _do_ want to keep.
   *
   */
  private walkWebhooks() {
    if (!isOpenAPI31(this.definition)) {
      return;
    } else if (!('webhooks' in this.definition) || !this.definition.webhooks) {
      return;
    }

    const definition = this.definition satisfies OpenAPIV3_1.Document;

    Object.keys(definition.webhooks || {}).forEach(webhookName => {
      const nameLC = webhookName.toLowerCase();
      if (this.hasWebhooksToReduceBy && !(nameLC in this.webhooksToReduceBy)) {
        return;
      }

      const webhook = definition.webhooks?.[webhookName];
      if (!webhook || typeof webhook !== 'object') {
        return;
      }

      Object.keys(webhook).forEach(method => {
        // Only process operations and retain any common path-level common properties like
        // `parameters`, `servers`, `summary`, etc.
        if (method === 'parameters' || !supportedMethods.includes(method.toLowerCase() as HttpMethods)) {
          return;
        }

        if (this.hasWebhooksToReduceBy) {
          // If we have webhooks we want to reduce but this isn't part of our filter set, then
          // ignore. We'll remove it later.
          const methodFilter = this.webhooksToReduceBy[nameLC];
          if (methodFilter !== '*' && Array.isArray(methodFilter) && !methodFilter.includes(method.toLowerCase())) {
            return;
          }
        }

        /**
         * If this webhook path item is a `$ref` then ignore it.
         * @fixme we should better support reducing this.
         */
        if (isRef(webhook)) {
          return;
        }

        const operation = webhook[method as HttpMethods] as OperationObject;
        if (!operation) {
          return;
        }

        if (this.hasTagsToReduceBy) {
          // If this operation either has no tags or none that we want to preseve, then prune it.
          if (!(operation.tags || []).filter(tag => this.tagsToReduceBy.includes(tag.toLowerCase())).length) {
            return;
          }
        }

        (operation.tags || []).forEach((tag: string) => {
          this.usedTags.add(tag);
        });

        this.queryForRefPointers(operation).forEach(({ value: ref }) => {
          const refStr = this.toRefString(ref);
          if (!refStr) {
            return;
          }

          this.$refs.add(refStr);
          const pathRef = this.parsePathRef(refStr);
          if (pathRef) {
            this.retainPathMethods.add(`${pathRef.path.toLowerCase()}|${pathRef.method.toLowerCase()}`);
          }

          const webhookRef = this.parseWebhookRef(refStr);
          if (webhookRef) {
            this.retainWebhookMethods.add(`${webhookRef.name.toLowerCase()}|${webhookRef.method.toLowerCase()}`);
          }

          this.accumulateUsedRefs(definition, this.$refs, refStr);
        });

        Object.values(operation.security || {}).forEach(sec => {
          Object.keys(sec).forEach(scheme => {
            this.$refs.add(`#/components/securitySchemes/${scheme}`);
          });
        });
      });
    });
  }

  /**
   * Prune back our `paths` object in the OpenAPI definition to only include paths that we want to
   * preserve.
   *
   */
  private reducePaths(): void {
    if (!('paths' in this.definition) || !this.definition.paths) {
      return;
    }

    Object.keys(this.definition.paths).forEach(path => {
      const pathLC = path.toLowerCase();

      if (this.hasPathsToReduceBy && !(pathLC in this.pathsToReduceBy)) {
        delete this.definition.paths?.[path];
        return;
      }

      Object.keys(this.definition.paths?.[path] || {}).forEach(method => {
        const methodLC = method.toLowerCase();

        // Only process operations and retain any common path-level common properties like
        // `parameters`, `servers`, `summary`, etc.
        if (method === 'parameters' || !supportedMethods.includes(methodLC as HttpMethods)) {
          return;
        }

        const retainedByRef =
          this.retainPathMethods.has(`${pathLC}|${methodLC}`) ||
          Array.from(this.$refs).some(ref => {
            const pathRef = this.parsePathRef(ref);
            return pathRef?.path.toLowerCase() === pathLC && pathRef?.method.toLowerCase() === methodLC;
          });

        if (methodLC !== 'parameters') {
          // If we're reducing paths and this operation isn't part of our filter set, and it's
          // not a cross-referenced operation that we want to retain, then we should prune it.
          if (this.hasPathsToReduceBy) {
            if (
              !retainedByRef &&
              this.pathsToReduceBy[pathLC] !== '*' &&
              Array.isArray(this.pathsToReduceBy[pathLC]) &&
              !this.pathsToReduceBy[pathLC].includes(methodLC)
            ) {
              delete this.definition.paths?.[path]?.[method as HttpMethods];
              return;
            }
          }
        }

        const operation = this.definition.paths?.[path]?.[method as HttpMethods];
        if (!operation) {
          throw new Error(`Operation \`${method} ${path}\` not found`);
        }

        // If we're reducing by tags and this operation doesn't live in one of those, remove it.
        if (this.hasTagsToReduceBy) {
          // If this operation doesn't have any tags that we want to preserve, and it isn't
          // cross-referenced from an operation we _do_ want to preserve, then remove it.
          if (!(operation.tags || []).filter(tag => this.tagsToReduceBy.includes(tag.toLowerCase())).length) {
            if (!retainedByRef) {
              delete this.definition.paths?.[path]?.[method as HttpMethods];
            }

            return;
          }
        }

        // Accumulate a list of used tags so we can filter out any ones that we don't need later.
        if ('tags' in operation) {
          operation.tags?.forEach((tag: string) => {
            this.usedTags.add(tag);
          });
        }

        // Accumulate any used operation-level security schemas that we need to retain.
        if ('security' in operation) {
          Object.values(operation.security || {}).forEach(sec => {
            Object.keys(sec).forEach(scheme => {
              this.$refs.add(`#/components/securitySchemes/${scheme}`);
            });
          });
        }
      });

      // If this path no longer has any methods, delete it.
      if (!Object.keys(this.definition.paths?.[path] || {}).length) {
        delete this.definition.paths?.[path];
      }
    });

    // If we don't have any more paths after cleanup, and we don't have any webhooks, then throw
    // an error because an OpenAPI definition must have at least one path.
    if (!Object.keys(this.definition.paths || {}).length) {
      if (!(this.definition.webhooks && Object.keys(this.definition.webhooks).length)) {
        throw new Error(
          'All paths in the API definition were removed. Did you supply the right path name to reduce by?',
        );
      }

      delete this.definition.paths;
    }
  }

  /**
   * Prune back our `webhooks` object in the OpenAPI definition to only include webhooks that we
   * want to preserve.
   *
   */
  private reduceWebhooks(): void {
    if (!isOpenAPI31(this.definition)) {
      return;
    } else if (!('webhooks' in this.definition) || !this.definition.webhooks) {
      return;
    }

    const definition = this.definition satisfies OpenAPIV3_1.Document;

    Object.keys(definition.webhooks || {}).forEach(webhookName => {
      const nameLC = webhookName.toLowerCase();
      if (this.hasWebhooksToReduceBy && !(nameLC in this.webhooksToReduceBy)) {
        const retainedByRef = Array.from(this.retainWebhookMethods).some(
          key => key.startsWith(`${nameLC}|`) || key === `${nameLC}|`,
        );

        if (!retainedByRef) {
          delete definition.webhooks?.[webhookName];
          return;
        }
      }

      const webhook = definition.webhooks?.[webhookName];
      if (!webhook || typeof webhook !== 'object') {
        return;
      }

      /**
       * If this webhook path item is a `$ref` then ignore it.
       * @fixme we should better support reducing this.
       */
      if (isRef(webhook)) {
        return;
      }

      Object.keys(webhook).forEach(method => {
        const methodLC = method.toLowerCase();
        if (method === 'parameters' || !supportedMethods.includes(methodLC as HttpMethods)) {
          return;
        }

        const retainedByRef = this.retainWebhookMethods.has(`${nameLC}|${methodLC}`);
        if (this.hasWebhooksToReduceBy && !retainedByRef) {
          const methodFilter = this.webhooksToReduceBy[nameLC];
          if (methodFilter !== '*' && Array.isArray(methodFilter) && !methodFilter.includes(methodLC)) {
            /**
             * If this webhook path item is a `$ref` then ignore and retain it.
             * @fixme we should better support reducing this.
             */
            if (!definition.webhooks?.[webhookName] || isRef(definition.webhooks?.[webhookName])) {
              return;
            }

            delete definition.webhooks?.[webhookName]?.[method as HttpMethods];
          }
        }
      });

      if (!Object.keys(definition.webhooks?.[webhookName] || {}).length) {
        delete definition.webhooks?.[webhookName];
      }
    });

    if (definition.webhooks && !Object.keys(definition.webhooks).length) {
      delete definition.webhooks;
    }
  }
}
