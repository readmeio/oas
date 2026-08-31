import type { OAS31Document, OASDocument } from '../../src/types.js';

import webhooks from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';
import { assert, describe, expect, it } from 'vitest';

import { OpenAPIPruner } from '../../src/pruner/index.js';
import { isOpenAPI31, isRef } from '../../src/types.js';
import pathItemsComponent from '../__datasets__/pathitems-component.json' with { type: 'json' };
import tagFilterCommonParameters from '../__datasets__/pruner-tag-filter-common-parameters.json' with { type: 'json' };
import pruner from '../__datasets__/pruner.json' with { type: 'json' };
import refEndpointToEndpoint from '../__datasets__/ref-endpoint-to-endpoint.json' with { type: 'json' };
import refPathWebhook from '../__datasets__/ref-path-webhook.json' with { type: 'json' };
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
      'authored-empty': {},
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

  it('removes path and webhook operations by tag together with unreachable dependencies', async () => {
    const pruned = OpenAPIPruner.init(pruner as OASDocument)
      .removeTag('INTERNAL')
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
    expect(pruned.components?.schemas).toStrictEqual({
      Shared: expect.any(Object),
      PublicOnly: expect.any(Object),
    });
    expect(pruned.components?.securitySchemes).toStrictEqual({
      publicAuth: expect.any(Object),
    });
    expect(pruned.tags).toStrictEqual([{ name: 'public' }]);

    const webhookPruned = OpenAPIPruner.init(webhooks as OAS31Document)
      .removeTag('WEBHOOKS')
      .prune();

    expect(webhookPruned).not.toHaveProperty('webhooks');
    expect(webhookPruned).not.toHaveProperty('components');

    const combinedPruned = OpenAPIPruner.init(pruner as OASDocument)
      .removeTag('internal')
      .removeOperation('/pets', 'get')
      .prune();

    expect(combinedPruned.paths).not.toHaveProperty('/pets');
    expect(combinedPruned.paths).not.toHaveProperty('/admin');

    const metadataPruned = OpenAPIPruner.init(tagFilterCommonParameters as OASDocument)
      .removeTag('public')
      .prune();

    await expect(metadataPruned).toBeAValidOpenAPIDefinition();
    expect(metadataPruned.paths).toStrictEqual({
      '/kept': {
        get: expect.any(Object),
      },
    });
    expect(metadataPruned).not.toHaveProperty('webhooks');
    expect(metadataPruned).not.toHaveProperty('components');
  });

  it('retains authored-empty Path Items and common parameter refs from operationless Path Items', async () => {
    const pruned = OpenAPIPruner.init(pruner as OASDocument).prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    expect(pruned.paths?.['/operationless']?.parameters).toStrictEqual([
      { $ref: '#/components/parameters/operationlessPath' },
    ]);
    expect(pruned.components?.parameters).toHaveProperty('operationlessPath');

    if (!isOpenAPI31(pruned)) {
      assert.fail('Resulting schema is not an OpenAPI 3.1 definition.');
    }

    expect(pruned.webhooks?.['authored-empty']).toStrictEqual({});
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

  it('removes operations by authored or generated operation ID together with other filters', async () => {
    const definition = structuredClone(pruner) as OASDocument;
    const pets = definition.paths?.['/pets'];
    if (!pets || isRef(pets) || !pets.get) {
      assert.fail('Pet operations are missing from the test fixture.');
    }

    pets.get.operationId = 'listPets';

    // listPets - testing exact match
    const unmatched = OpenAPIPruner.init(definition).removeOperationId('listpets').prune();

    await expect(unmatched).toBeAValidOpenAPIDefinition();
    expect(unmatched.paths).toStrictEqual(definition.paths);

    const pruned = OpenAPIPruner.init(definition)
      .removeOperationId('listPets')
      .removeOperationId('post_pets')
      .removePath('/admin')
      .prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    expect(pruned.paths).not.toHaveProperty('/pets');
    expect(pruned.paths).not.toHaveProperty('/admin');
  });

  it('retains a shared Path Item component when another path still references it', async () => {
    const definition = {
      openapi: '3.1.0',
      info: { title: 'Shared path item', version: '1.0.0' },
      paths: {
        '/pets': { $ref: '#/components/pathItems/petCollection' },
        '/store/pets': { $ref: '#/components/pathItems/petCollection' },
      },
      components: {
        pathItems: {
          petCollection: {
            get: { responses: { 200: { description: 'OK' } } },
          },
        },
      },
    } as OAS31Document;

    const pruned = OpenAPIPruner.init(definition).removePath('/pets').prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    if (!isOpenAPI31(pruned)) {
      assert.fail('Resulting schema is not an OpenAPI 3.1 definition.');
    }

    expect(pruned.paths).not.toHaveProperty('/pets');
    expect(pruned.paths?.['/store/pets']).toStrictEqual(definition.paths?.['/store/pets']);
    expect(pruned.components?.pathItems?.petCollection).toStrictEqual(definition.components?.pathItems?.petCollection);
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

  it('does not narrow a whole-path or whole-webhook removal to a single operation', () => {
    const pathPruned = OpenAPIPruner.init(pruner as OASDocument)
      .removePath('/pets')
      .removeOperation('/pets', 'get')
      .prune();

    expect(pathPruned.paths).not.toHaveProperty('/pets');

    const webhookPruned = OpenAPIPruner.init(webhooks as OAS31Document)
      .removeWebhook('newPet')
      .removeWebhook('newPet', 'post')
      .prune();

    expect(webhookPruned).not.toHaveProperty('webhooks');
  });

  it('refuses to remove an operation referenced by a surviving operation', () => {
    const definition = refEndpointToEndpoint as OASDocument;

    expect(() => OpenAPIPruner.init(definition).removeOperation('/endpoint1', 'get').prune()).toThrow(
      'Cannot remove operation `GET /endpoint1` because it is referenced.',
    );

    const taggedDefinition = structuredClone(definition);
    const referencedPath = taggedDefinition.paths?.['/endpoint1'];
    if (!referencedPath || isRef(referencedPath) || !referencedPath.get) {
      assert.fail('Referenced operation is missing from the test fixture.');
    }

    referencedPath.get.tags = ['internal'];
    expect(() => OpenAPIPruner.init(taggedDefinition).removeTag('internal').prune()).toThrow(
      'Cannot remove operation `GET /endpoint1` because it is referenced.',
    );
  });

  it('refuses to remove paths and webhooks that surviving operations still reference', () => {
    const definition = refPathWebhook as OAS31Document;

    expect(() => OpenAPIPruner.init(definition).removePath('/orders').prune()).toThrow(
      'Cannot remove path `/orders` because one of its operations is referenced.',
    );

    expect(() => OpenAPIPruner.init(definition).removeOperation('/orders', 'get').prune()).toThrow(
      'Cannot remove operation `GET /orders` because it is referenced.',
    );

    expect(() => OpenAPIPruner.init(definition).removeWebhook('orderCreated', 'post').prune()).toThrow(
      'Cannot remove operation `POST orderCreated` because it is referenced.',
    );

    expect(() => OpenAPIPruner.init(definition).removeWebhook('orderCreated').prune()).toThrow(
      'Cannot remove webhook `orderCreated` because one of its operations is referenced.',
    );
  });

  it('retains a referenced webhook Path Item unless its entire webhook is removed', async () => {
    const definition = {
      openapi: '3.1.0',
      info: { title: 'Webhook path item', version: '1.0.0' },
      webhooks: {
        newPet: { $ref: '#/components/pathItems/newPet' },
      },
      components: {
        pathItems: {
          newPet: {
            post: { responses: { 200: { description: 'OK' } } },
            delete: { responses: { 200: { description: 'OK' } } },
          },
        },
      },
    } as OAS31Document;

    const pruned = OpenAPIPruner.init(definition).removeWebhook('newPet', 'post').prune();

    await expect(pruned).toBeAValidOpenAPIDefinition();
    if (!isOpenAPI31(pruned)) {
      assert.fail('Resulting schema is not an OpenAPI 3.1 definition.');
    }

    expect(pruned.webhooks?.newPet).toStrictEqual(definition.webhooks?.newPet);
    expect(pruned.components?.pathItems?.newPet).toStrictEqual(definition.components?.pathItems?.newPet);

    const webhookPruned = OpenAPIPruner.init(definition).removeWebhook('newPet').prune();

    expect(webhookPruned).not.toHaveProperty('webhooks');
    expect(webhookPruned).not.toHaveProperty('components');
  });
});
