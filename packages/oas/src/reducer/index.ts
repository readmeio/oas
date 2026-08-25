import type { OASDocument } from '../types.js';

import { OpenAPITransformer } from '../lib/transformer/index.js';

export class OpenAPIReducer extends OpenAPITransformer {
  private constructor(definition: OASDocument) {
    super(definition, {
      mode: 'reduce',
    });
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
   * Tag filters intersect with path, operation, and webhook filters. When they are combined, an
   * operation must match both its tag filter and its relevant location filter to be retained.
   *
   * All OpenAPI definitions reduced will still be fully functional and valid OpenAPI definitions.
   *
   * @param definition An OpenAPI definition to reduce.
   */
  static init(definition: OASDocument): OpenAPIReducer {
    return new OpenAPIReducer(definition);
  }

  /**
   * Mark an OpenAPI tag to be included in our reduced API definition. When combined with a path,
   * operation, or webhook filter, this tag filter further narrows that selection. Tag casing does
   * not matter.
   *
   * @param tag The tag to mark for reduction.
   */
  byTag(tag: string): OpenAPIReducer {
    this.selectTag(tag);
    return this;
  }

  /**
   * Mark an entire OpenAPI path, and all methods that it contains, to be included in your reduced
   * API definition. Path casing does not matter.
   *
   * @param path The path to mark for reduction.
   */
  byPath(path: string): OpenAPIReducer {
    this.selectPath(path);
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
   */
  byOperation(path: string, method: string): OpenAPIReducer {
    this.selectOperation(path, method);
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
    this.selectWebhook(webhookName, method);
    return this;
  }

  /**
   * Reduce the current OpenAPI definition down to the configured filters.
   *
   */
  reduce(): OASDocument {
    return this.transform();
  }
}
