import type { OASDocument } from '../types.js';

import { OpenAPITransformer } from '../lib/transformer/index.js';

export class OpenAPIPruner extends OpenAPITransformer {
  private constructor(definition: OASDocument) {
    super(definition, {
      mode: 'prune',
    });
  }

  /**
   * Initialize a new `OpenAPIPruner`. The pruner removes selected paths, operations, and webhooks
   * together with components and tags that are no longer reachable from the remaining operations.
   *
   * @param definition OpenAPI definition to prune.
   */
  static init(definition: OASDocument): OpenAPIPruner {
    return new OpenAPIPruner(definition);
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
   * @param path Path containing the operation.
   * @param method HTTP method of the operation to remove.
   */
  removeOperation(path: string, method: string): OpenAPIPruner {
    this.selectOperation(path, method);
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
   * @param webhookName Webhook containing the operation.
   * @param method HTTP method of the operation to remove.
   */
  removeWebhook(webhookName: string, method: string): OpenAPIPruner;

  removeWebhook(webhookName: string, method?: string): OpenAPIPruner {
    this.selectWebhook(webhookName, method);
    return this;
  }

  /** Prune the configured paths, operations, and webhooks from the OpenAPI definition. */
  prune(): OASDocument {
    return this.transform();
  }
}
