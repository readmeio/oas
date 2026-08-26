import type {
  ComponentsObject,
  HttpMethods,
  OASDocument,
  OperationObject,
  PathItemObject,
  TagObject,
} from '../../types.js';
import type { OpenAPIV3_1 } from 'openapi-types';

import jsonPointer from 'jsonpointer';

import { query } from '../../analyzer/util.js';
import { Operation } from '../../operation/index.js';
import { isOpenAPI31, isRef } from '../../types.js';
import { supportedMethods } from '../../utils.js';
import { decodePointer } from '../refs.js';

import { OperationSelection } from './operation-selection.js';

interface OpenAPITransformerOptions {
  /** Whether selected paths, operations, and webhooks should be retained or removed. */
  mode: 'prune' | 'reduce';
}

/**
 * Internal engine for selecting operations and transforming an OpenAPI definition down to its
 * reachable paths, webhooks, components, and tags.
 */
export class OpenAPITransformer {
  private definition: OASDocument;

  private readonly mode: 'prune' | 'reduce';

  /**
   * A collection of `$ref` pointers that are used within our transformed API definition. This is
   * used to ensure that all referenced schemas are retained in our resulting API definition. Not
   * retaining them would result in an invalid OpenAPI definition.
   */
  private $refs: Set<string> = new Set();

  /**
   * A collection of OpenAPI tags that are used within the transformed API definition.
   */
  private usedTags: Set<string> = new Set();

  /**
   * A collection of OpenAPI paths and operations that are cross-referenced from any other paths
   * and operations that we're retaining. This collection is used to ensure that those operations
   * are retained in our resulting API definition. Not retaining them would result in an invalid
   * OpenAPI definition.
   */
  private retainPathMethods: Set<`${string}|${string}`> = new Set();

  /**
   * A collection of OpenAPI webhook names and methods that are cross-referenced from any other
   * schemas. This collection, like `retainPathMethods`, is used to ensure that those operations are
   * retained in our resulting API definition. Not retaining them would result in an invalid
   * OpenAPI definition.
   */
  private retainWebhookMethods: Set<`${string}|${string}`> = new Set();

  /** An array of OpenAPI tags selected for the current transformation. */
  private tagSelection: string[] = [];

  /** A collection of operation IDs selected for the current transformation. */
  private operationIdSelection = new Set<string>();

  /** A collection of OpenAPI paths and operations selected for the current transformation. */
  private pathSelection = new OperationSelection();

  /** A collection of OpenAPI webhooks selected for the current transformation. */
  private webhookSelection = new OperationSelection();

  private hasTagSelection: boolean = false;
  private hasOperationIdSelection: boolean = false;
  private hasPathSelection: boolean = false;
  private hasWebhookSelection: boolean = false;

  /**
   * @param definition OpenAPI definition to transform.
   * @param options Transformation mode.
   */
  protected constructor(definition: OASDocument, options: OpenAPITransformerOptions) {
    this.definition = structuredClone(definition);
    this.mode = options.mode;
  }

  /**
   * Select an OpenAPI tag. Operations with this tag are retained when reducing and removed when
   * pruning. Tag casing does not matter.
   *
   * @param tag Tag to select.
   */
  protected selectTag(tag: string): void {
    this.tagSelection.push(tag.toLowerCase());
  }

  /**
   * Select an entire OpenAPI path and all operations that it contains. Selected paths are retained
   * when reducing and removed when pruning. Path casing does not matter.
   *
   * @param path Path to select.
   */
  protected selectPath(path: string): void {
    this.pathSelection.addAll(path);
  }

  /**
   * Select a single OpenAPI operation. Selected operations are retained when reducing and removed
   * when pruning. Path and method casing does not matter.
   *
   * In reduce mode, selecting an operation after its entire path replaces the all-operation
   * selection with that operation and any operations selected afterward. Prune mode keeps the
   * entire path selected.
   *
   * @param path Path containing the operation.
   * @param method HTTP method of the operation to select.
   */
  protected selectOperation(path: string, method: string): void {
    if (this.mode === 'reduce' && this.pathSelection.matchesAll(path)) {
      this.pathSelection.clear(path);
    }

    this.pathSelection.addOperation(path, method);
  }

  /**
   * Select an OpenAPI operation by its operation ID. IDs are matched exactly and are generated
   * from the operation path and method when one is not authored in the definition.
   *
   * @param operationId Operation ID to select.
   */
  protected selectOperationId(operationId: string): void {
    this.operationIdSelection.add(operationId);
  }

  /**
   * Select an OpenAPI webhook or one of its operations. Selected webhooks are retained when
   * reducing and removed when pruning. Webhook and method casing does not matter.
   *
   * @param webhookName Webhook to select.
   * @param method Optional HTTP method of an individual webhook operation to select.
   */
  protected selectWebhook(webhookName: string, method?: string): void {
    if (!method) {
      this.webhookSelection.addAll(webhookName);
      return;
    }

    if (this.mode === 'reduce' && this.webhookSelection.matchesAll(webhookName)) {
      this.webhookSelection.clear(webhookName);
    }

    this.webhookSelection.addOperation(webhookName, method);
  }

  /** Transform the OpenAPI definition according to the configured mode and selections. */
  protected transform(): OASDocument {
    if (!this.definition.openapi) {
      throw new Error('Sorry, only OpenAPI definitions are supported.');
    }

    this.hasTagSelection = Boolean(this.tagSelection.length);
    this.hasOperationIdSelection = this.operationIdSelection.size > 0;
    this.hasPathSelection = this.pathSelection.hasSelections;
    this.hasWebhookSelection = this.webhookSelection.hasSelections;

    // Retain any root-level security definitions, regardless if they're used or not on operations
    // that we're retaining.
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

    /**
     * @fixme Resolve referenced Path Items and expand the complete dependency set of operations and
     * Path Items retained transitively through cross-operation references before mutating paths or
     * webhooks.
     */
    this.transformPaths();
    this.transformWebhooks();

    // Require at least one path or one webhook in the result.
    const hasPaths = Boolean(this.definition.paths && Object.keys(this.definition.paths).length);
    const hasWebhooks = Boolean(
      'webhooks' in this.definition && this.definition.webhooks && Object.keys(this.definition.webhooks).length,
    );

    // If we don't have any paths or webhooks left, retain the reducer's no-match error to help catch
    // invalid selections. An empty definition is valid OpenAPI so we allow it when pruning.
    if (this.mode === 'reduce' && !hasPaths && !hasWebhooks) {
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
              // If we don't look for these then we'll end up removing them from the transformed
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
   * retain cross-operation references within the transformed definition.
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
   * and method so the transformer can retain cross-operation references.
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
   * webhook name and method so the transformer can retain cross-referenced webhook operations.
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

  /** Determine whether a path or webhook is excluded in the current transformation mode. */
  private isContainerExcluded(selection: OperationSelection, key: string): boolean {
    if (this.mode === 'prune') {
      return selection.matchesAll(key);
    }

    return !selection.has(key);
  }

  /**
   * Determine whether an operation passes the configured filters before cross-operation references
   * are considered.
   */
  private shouldRetainOperation(
    selection: OperationSelection,
    key: string,
    method: string,
    operation: OperationObject,
  ): boolean {
    if (this.mode === 'reduce') {
      // Reduction filters intersect, so an operation must match every configured filter.
      if (selection.hasSelections && !selection.matches(key, method)) return false;
      if (
        this.hasOperationIdSelection &&
        !this.operationIdSelection.has(Operation.getOperationId(key, method, operation))
      ) {
        return false;
      }
      if (this.hasTagSelection && !(operation.tags || []).some(tag => this.tagSelection.includes(tag.toLowerCase()))) {
        return false;
      }
    } else {
      // Pruning filters are additive, so matching any configured filter removes an operation.
      if (selection.hasSelections && selection.matches(key, method)) return false;
      if (
        this.hasOperationIdSelection &&
        this.operationIdSelection.has(Operation.getOperationId(key, method, operation))
      ) {
        return false;
      }
      if (this.hasTagSelection && (operation.tags || []).some(tag => this.tagSelection.includes(tag.toLowerCase()))) {
        return false;
      }
    }

    // No configured filter excluded this operation, so retain it in the transformed definition.
    return true;
  }

  /** Determine whether a path item contains at least one HTTP operation. */
  private hasOperations(pathItem: PathItemObject | undefined): boolean {
    return Boolean(pathItem && supportedMethods.some(method => method in pathItem));
  }

  /**
   * Accumulate any `$ref` pointers that are used by common Path Item parameters.
   *
   * @param parameters Common Path Item parameters to inspect for `$ref` pointers.
   */
  private accumulateParameterRefs(parameters: PathItemObject['parameters'] | undefined): void {
    if (!parameters) {
      return;
    }

    this.queryForRefPointers(parameters).forEach(({ value: ref }) => {
      const refStr = this.toRefString(ref);
      if (!refStr) {
        return;
      }

      this.$refs.add(refStr);
      this.accumulateUsedRefs(this.definition, this.$refs, refStr);
    });
  }

  /**
   * Walk through the `paths` in our OpenAPI definition and determine which operations we want to
   * retain. Accumulate any `$ref` pointers that they use so their referenced schemas can also be
   * retained in our resulting API definition.
   *
   */
  private walkPaths(): void {
    if (!('paths' in this.definition) || !this.definition.paths) {
      return;
    }

    Object.keys(this.definition.paths).forEach(path => {
      // When only webhooks were requested (no path/operation filter), ignore all paths, but don't
      // delete them yet because a selected webhook may reference one of their operations. We'll
      // remove any that aren't referenced later.
      if (this.mode === 'reduce' && this.hasWebhookSelection && !this.hasPathSelection) {
        return;
      } else if (this.hasPathSelection && this.isContainerExcluded(this.pathSelection, path)) {
        return;
      }

      const pathItem = this.definition.paths?.[path];

      /**
       * Referenced Path Items that remain in the result are preserved intact rather than partially
       * transformed. Retain the target and continue walking any local sibling fields so that we
       * retain their dependencies too.
       * @fixme Resolve referenced Path Items so their operations can be transformed individually.
       */
      if (isRef(pathItem)) {
        this.$refs.add(pathItem.$ref);
        this.accumulateUsedRefs(this.definition, this.$refs, pathItem.$ref);
      }

      // If this Path Item has no operations then it will remain in our resulting API definition,
      // so we need to retain any components referenced by its common parameters.
      if (!this.hasOperations(pathItem)) {
        this.accumulateParameterRefs(pathItem?.parameters);
      }

      Object.keys(pathItem || {}).forEach(method => {
        // Only process operations and retain any common path-level common properties like
        // `parameters`, `servers`, `summary`, etc.
        if (method === 'parameters' || !supportedMethods.includes(method.toLowerCase() as HttpMethods)) {
          return;
        }

        const operation = this.definition.paths?.[path]?.[method as HttpMethods] as OperationObject;
        if (!operation) {
          throw new Error(`Operation \`${method} ${path}\` not found`);
        }

        // If this operation isn't part of our resulting API definition then ignore it. We'll
        // remove it later.
        if (!this.shouldRetainOperation(this.pathSelection, path, method, operation)) {
          return;
        }

        (operation.tags || []).forEach((tag: string) => {
          this.usedTags.add(tag);
        });

        // Skipped by the `method === 'parameters'` guard above; accumulate here so refs are only
        // retained when at least one operation on this path passes all filters.
        this.accumulateParameterRefs(pathItem?.parameters);

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
   * Walk through the `webhooks` in our OpenAPI definition and determine which operations we want
   * to retain. Accumulate any `$ref` pointers that they use so their referenced schemas can also be
   * retained in our resulting API definition.
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
      if (this.hasWebhookSelection && this.isContainerExcluded(this.webhookSelection, webhookName)) {
        return;
      }

      const webhook: PathItemObject | undefined = definition.webhooks?.[webhookName];
      if (!webhook || typeof webhook !== 'object') {
        return;
      }

      /**
       * Referenced webhook Path Items that remain in the result are preserved intact rather than
       * partially transformed. Retain the target and continue walking any local sibling fields so
       * that we retain their dependencies too.
       * @fixme Resolve referenced Path Items so their operations can be transformed individually.
       */
      if (typeof webhook.$ref === 'string') {
        this.$refs.add(webhook.$ref);
        this.accumulateUsedRefs(definition, this.$refs, webhook.$ref);
      }

      // If this webhook has no operations then it will remain in our resulting API definition, so
      // we need to retain any components referenced by its common parameters.
      if (!this.hasOperations(webhook)) {
        this.accumulateParameterRefs(webhook.parameters);
      }

      Object.keys(webhook).forEach(method => {
        // Only process operations and retain any common path-level common properties like
        // `parameters`, `servers`, `summary`, etc.
        if (method === 'parameters' || !supportedMethods.includes(method.toLowerCase() as HttpMethods)) {
          return;
        }

        const operation = webhook[method as HttpMethods] as OperationObject;
        if (!operation) {
          throw new Error(`Webhook operation \`${method} ${webhookName}\` not found`);
        }

        // If this operation isn't part of our resulting API definition then ignore it. We'll
        // remove it later.
        if (!this.shouldRetainOperation(this.webhookSelection, webhookName, method, operation)) {
          return;
        }

        (operation.tags || []).forEach((tag: string) => {
          this.usedTags.add(tag);
        });

        // Skipped by the `method === 'parameters'` guard above; accumulate here so refs are only
        // retained when at least one operation on this webhook passes all filters.
        this.accumulateParameterRefs(webhook.parameters);

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
   * Transform our `paths` object according to the paths and operations that we've selected.
   */
  private transformPaths(): void {
    if (!('paths' in this.definition) || !this.definition.paths) {
      return;
    }

    Object.keys(this.definition.paths).forEach(path => {
      const pathLC = path.toLowerCase();
      const excludePathItem =
        (this.hasPathSelection && this.isContainerExcluded(this.pathSelection, path)) ||
        (this.mode === 'reduce' && this.hasWebhookSelection && !this.hasPathSelection);

      if (this.mode === 'prune' && excludePathItem) {
        if (Array.from(this.retainPathMethods).some(key => key.startsWith(`${pathLC}|`))) {
          throw new Error(`Cannot remove path \`${path}\` because one of its operations is referenced.`);
        }

        delete this.definition.paths?.[path];
        return;
      }

      const pathItem = this.definition.paths?.[path];

      /**
       * Referenced Path Items are preserved intact during operation-level filtering. If the whole
       * Path Item is excluded, remove it unless a surviving operation references it.
       * @fixme Resolve referenced Path Items so their operations can be transformed individually.
       */
      if (isRef(pathItem)) {
        if (excludePathItem) {
          const retainedByRef = Array.from(this.retainPathMethods).some(key => key.startsWith(`${pathLC}|`));
          if (!retainedByRef) {
            delete this.definition.paths?.[path];
          }
        }

        return;
      }

      let removedOperation = false;
      Object.keys(pathItem || {}).forEach(method => {
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

        const operation = this.definition.paths?.[path]?.[method as HttpMethods];
        if (!operation) {
          throw new Error(`Operation \`${method} ${path}\` not found`);
        }

        if (excludePathItem || !this.shouldRetainOperation(this.pathSelection, path, method, operation)) {
          if (this.mode === 'prune' && retainedByRef) {
            throw new Error(`Cannot remove operation \`${method.toUpperCase()} ${path}\` because it is referenced.`);
          }

          if (!retainedByRef) {
            delete this.definition.paths?.[path]?.[method as HttpMethods];
            removedOperation = true;
            return;
          }
        }

        // This operation remains in the transformed definition, so retain any components
        // referenced by its common Path Item parameters.
        this.accumulateParameterRefs(pathItem?.parameters);

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

      // If filtering removed every operation from this path then remove its path-level properties
      // as well. We leave path items that were authored without operations untouched.
      if (
        ((removedOperation || (this.mode === 'reduce' && excludePathItem)) && !this.hasOperations(pathItem)) ||
        (this.mode === 'reduce' && !Object.keys(this.definition.paths?.[path] || {}).length)
      ) {
        delete this.definition.paths?.[path];
      }
    });

    // If we don't have any paths left then retain the reducer's no-match error. An empty Paths
    // Object is valid OpenAPI so we allow it when pruning.
    if (!Object.keys(this.definition.paths || {}).length) {
      if (this.mode === 'reduce' && !(this.definition.webhooks && Object.keys(this.definition.webhooks).length)) {
        throw new Error(
          'All paths in the API definition were removed. Did you supply the right path name to reduce by?',
        );
      }

      if (this.definition.webhooks && Object.keys(this.definition.webhooks).length) {
        delete this.definition.paths;
      }
    }
  }

  /**
   * Transform our `webhooks` object according to the webhooks and operations that we've selected.
   */
  private transformWebhooks(): void {
    if (!isOpenAPI31(this.definition)) {
      return;
    } else if (!('webhooks' in this.definition) || !this.definition.webhooks) {
      return;
    }

    const definition = this.definition satisfies OpenAPIV3_1.Document;

    Object.keys(definition.webhooks || {}).forEach(webhookName => {
      const nameLC = webhookName.toLowerCase();
      const excludeWebhook = this.hasWebhookSelection && this.isContainerExcluded(this.webhookSelection, webhookName);

      if (this.mode === 'prune' && excludeWebhook) {
        const retainedByRef = Array.from(this.retainWebhookMethods).some(key => key.startsWith(`${nameLC}|`));

        if (retainedByRef) {
          throw new Error(`Cannot remove webhook \`${webhookName}\` because one of its operations is referenced.`);
        }

        delete definition.webhooks?.[webhookName];
        return;
      }

      const webhook = definition.webhooks?.[webhookName];
      if (!webhook || typeof webhook !== 'object') {
        return;
      }

      /**
       * Referenced webhook Path Items are preserved intact during operation-level filtering. If
       * the whole webhook is excluded, remove it unless a surviving operation references it.
       * @fixme Resolve referenced Path Items so their operations can be transformed individually.
       */
      if (isRef(webhook)) {
        if (excludeWebhook) {
          const retainedByRef = Array.from(this.retainWebhookMethods).some(key => key.startsWith(`${nameLC}|`));
          if (!retainedByRef) {
            delete definition.webhooks?.[webhookName];
          }
        }

        return;
      }

      let removedOperation = false;
      Object.keys(webhook).forEach(method => {
        const methodLC = method.toLowerCase();
        if (method === 'parameters' || !supportedMethods.includes(methodLC as HttpMethods)) {
          return;
        }

        const operation = webhook[method as HttpMethods];
        if (!operation) {
          throw new Error(`Webhook operation \`${method} ${webhookName}\` not found`);
        }

        const retainedByRef = this.retainWebhookMethods.has(`${nameLC}|${methodLC}`);
        if (excludeWebhook || !this.shouldRetainOperation(this.webhookSelection, webhookName, method, operation)) {
          if (this.mode === 'prune' && retainedByRef) {
            throw new Error(
              `Cannot remove operation \`${method.toUpperCase()} ${webhookName}\` because it is referenced.`,
            );
          }

          if (!retainedByRef) {
            delete webhook[method as HttpMethods];
            removedOperation = true;
            return;
          }
        }

        // This operation remains in the transformed definition, so retain any components
        // referenced by its common Path Item parameters.
        this.accumulateParameterRefs(webhook.parameters);

        (operation.tags || []).forEach((tag: string) => {
          this.usedTags.add(tag);
        });

        Object.values(operation.security || {}).forEach(sec => {
          Object.keys(sec).forEach(scheme => {
            this.$refs.add(`#/components/securitySchemes/${scheme}`);
          });
        });
      });

      if (
        ((removedOperation || (this.mode === 'reduce' && excludeWebhook)) && !this.hasOperations(webhook)) ||
        (this.mode === 'reduce' && !Object.keys(definition.webhooks?.[webhookName] || {}).length)
      ) {
        delete definition.webhooks?.[webhookName];
      }
    });

    if (definition.webhooks && !Object.keys(definition.webhooks).length) {
      delete definition.webhooks;
    }
  }
}
