import type { OAS31Document, OASDocument } from '../../src/types.js';

import webhooks from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';
import { assert, describe, expect, it } from 'vitest';

import { OpenAPIPruner } from '../../src/pruner/index.js';
import { isOpenAPI31 } from '../../src/types.js';
import pathItemsComponent from '../__datasets__/pathitems-component.json' with { type: 'json' };
import pruner from '../__datasets__/pruner.json' with { type: 'json' };
import refEndpointToEndpoint from '../__datasets__/ref-endpoint-to-endpoint.json' with { type: 'json' };
import securityRootLevel from '../__datasets__/security-root-level.json' with { type: 'json' };

// oxlint-disable-next-line vitest/require-hook
expect.extend({ toBeAValidOpenAPIDefinition });

describe('OpenAPIPruner', () => {
  it('removes paths and operations together with dependencies that are no longer reachable', async () => {
    const definition = pruner as OASDocument;
    const original = structuredClone(definition);

    const pruned = OpenAPIPruner.init(definition)
      .removeOperation('/PETS', 'POST')
      .removePath('/ADMIN')
      .removeOperation('/admin', 'get')
      .prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    expect(pruned.paths).toStrictEqual({
      '/pets': {
        parameters: [{ $ref: '#/components/parameters/tenantId' }],
        get: expect.any(Object),
      },
      '/authored-empty': {},
      '/operationless': {
        parameters: [{ $ref: '#/components/parameters/operationlessPath' }],
      },
    });
    expect(pruned.webhooks).toStrictEqual({
      operationless: {
        parameters: [{ $ref: '#/components/parameters/operationlessWebhook' }],
      },
    });
    expect(pruned.components).toStrictEqual({
      parameters: {
        tenantId: expect.any(Object),
        operationlessPath: expect.any(Object),
        operationlessWebhook: expect.any(Object),
      },
      schemas: {
        Shared: expect.any(Object),
        PublicOnly: expect.any(Object),
      },
      securitySchemes: {
        publicAuth: expect.any(Object),
      },
    });
    expect(pruned.tags).toStrictEqual([{ name: 'public' }]);
    expect(definition).toStrictEqual(original);
  });

  it('retains common parameter refs from operationless Path Items and webhooks', async () => {
    const pruned = OpenAPIPruner.init(pruner as OASDocument).prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    expect(pruned.paths?.['/operationless']?.parameters).toStrictEqual([
      { $ref: '#/components/parameters/operationlessPath' },
    ]);
    expect(pruned.components?.parameters).toHaveProperty('operationlessPath');

    if (!isOpenAPI31(pruned)) {
      assert.fail('Resulting schema is not an OpenAPI 3.1 definition.');
    }

    expect(pruned.webhooks?.operationless).toStrictEqual({
      parameters: [{ $ref: '#/components/parameters/operationlessWebhook' }],
    });
    expect(pruned.components?.parameters).toHaveProperty('operationlessWebhook');
  });

  it('returns an empty paths object when every operation is removed', async () => {
    const definition = securityRootLevel as OASDocument;
    const pruned = OpenAPIPruner.init(definition)
      .removeOperation('/anything/apiKey', 'get')
      .removeOperation('/anything/apiKey', 'post')
      .prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    expect(pruned.paths).toStrictEqual({});
    expect(pruned.components).toStrictEqual({
      securitySchemes: {
        apiKey_query: expect.any(Object),
      },
    });
  });

  it('removes webhook operations and their unreachable dependencies', async () => {
    const definition = webhooks as OAS31Document;
    const pruned = OpenAPIPruner.init(definition).removeWebhook('NEWPET', 'POST').prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    expect(pruned.webhooks).toStrictEqual({
      newPet: {
        delete: expect.any(Object),
      },
    });
    expect(pruned).not.toHaveProperty('components');

    const webhookPruned = OpenAPIPruner.init(definition).removeWebhook('newPet').prune();

    expect(webhookPruned).not.toHaveProperty('webhooks');
    expect(webhookPruned).not.toHaveProperty('components');
  });

  it('retains a referenced Path Item unless its entire path is removed', async () => {
    const definition = pathItemsComponent as OAS31Document;
    const pruned = OpenAPIPruner.init(definition).removeOperation('/pet/:id', 'get').prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    if (!isOpenAPI31(pruned)) {
      assert.fail('Resulting schema is not an OpenAPI 3.1 definition.');
    }

    expect(pruned.paths?.['/pet/:id']).toStrictEqual(definition.paths?.['/pet/:id']);
    expect(pruned.components?.pathItems?.singlePet).toStrictEqual(definition.components?.pathItems?.singlePet);

    const pathPruned = OpenAPIPruner.init(definition).removePath('/pet/:id').prune();

    expect(pathPruned.paths).not.toHaveProperty('/pet/:id');
    expect(pathPruned).not.toHaveProperty('components');
  });

  it('refuses to remove an operation referenced by a surviving operation', () => {
    const definition = refEndpointToEndpoint as OASDocument;

    expect(() => OpenAPIPruner.init(definition).removeOperation('/endpoint1', 'get').prune()).toThrow(
      'Cannot remove operation `GET /endpoint1` because it is referenced.',
    );
  });
});
