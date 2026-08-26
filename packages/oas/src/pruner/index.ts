import type { OASDocument } from '../types.js';

import { OpenAPITransformer } from '../lib/transformer/index.js';

export class OpenAPIPruner extends OpenAPITransformer {
  private constructor(definition: OASDocument) {
    super(definition, {
      mode: 'prune',
    });
  }

  /**
   * Initialize a new `OpenAPIPruner`. The pruner removes selected tags, paths, operations,
   * operation IDs, and webhooks together with components and tags that are no longer reachable
   * from the remaining operations. Removal filters are additive, so an operation matching any
   * configured filter is removed.
   *
   * @param definition OpenAPI definition to prune.
   */
  static init(definition: OASDocument): OpenAPIPruner {
    return new OpenAPIPruner(definition);
  }

  /**
   * Remove every OpenAPI operation containing a tag. Operations without any tags are retained. Tag
   * casing does not matter.
   *
   * When combined with operation ID, path, operation, or webhook removals, the filters remain
   * additive. Any operation matching the tag OR another removal filter will be removed.
   *
   * @param tag Tag whose operations should be removed.
   */
  removeTag(tag: string): OpenAPIPruner {
    this.selectTag(tag);
    return this;
  }

  /**
   * Remove an entire OpenAPI path and all operations that it contains. Path casing does not matter.
   *
   * @param path Path to remove.
   */
  removePath(path: string): OpenAPIPruner {
    this.selectPath(path);
    return this;
  }

  /**
   * Remove a single OpenAPI operation. Path and method casing does not matter.
   *
   * If you previously called `.removePath()` to remove the entire path, calling
   * `.removeOperation()` will not narrow that selection. The entire path will still be removed.
   *
   * @param path Path containing the operation.
   * @param method HTTP method of the operation to remove.
   */
  removeOperation(path: string, method: string): OpenAPIPruner {
    this.selectOperation(path, method);
    return this;
  }

  /**
   * Remove an OpenAPI operation by its operation ID. IDs are matched exactly. If an operation does
   * not have an authored ID, the generated ID from `Operation.getOperationId()` can be used instead.
   *
   * Operation ID filters are additive with tag, path, operation, and webhook filters.
   *
   * @param operationId Operation ID to remove.
   */
  removeOperationId(operationId: string): OpenAPIPruner {
    this.selectOperationId(operationId);
    return this;
  }

  /**
   * Remove an OpenAPI webhook and all operations that it contains. Webhook casing does not matter.
   *
   * @param webhookName Webhook to remove.
   */
  removeWebhook(webhookName: string): OpenAPIPruner;

  /**
   * Remove a single OpenAPI webhook operation. Webhook and method casing does not matter.
   *
   * If you previously called `.removeWebhook()` to remove the entire webhook, calling it again
   * with a method will not narrow that selection. The entire webhook will still be removed.
   *
   * @param webhookName Webhook containing the operation.
   * @param method HTTP method of the operation to remove.
   */
  removeWebhook(webhookName: string, method: string): OpenAPIPruner;

  removeWebhook(webhookName: string, method?: string): OpenAPIPruner {
    this.selectWebhook(webhookName, method);
    return this;
  }

  /** Prune the configured tags, paths, operations, operation IDs, and webhooks from the definition. */
  prune(): OASDocument {
    return this.transform();
  }
}
