import type { OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import webhooksSpec from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import webhooks32Spec from '@readme/oas-examples/3.2/json/webhooks.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import { analyzeOperation, analyzeWebhookOperation, analyzer } from '../../src/analyzer/index.js';
import additionalOperationsSpec from '../__datasets__/additional-operations.json' with { type: 'json' };

describe('#analyzer()', () => {
  it('should should analyzer an OpenAPI definition', async () => {
    await expect(analyzer(petstore as OASDocument)).resolves.toMatchSnapshot();
  });
});

describe('#analyzeOperation()', () => {
  it('should query for everything by default', async () => {
    const analysis = await analyzeOperation(petstore as OASDocument, {
      method: 'post',
      path: '/user/createWithArray',
    });

    expect(analysis).toMatchSnapshot();
  });

  it('should support supplying a specific query', async () => {
    const analysis = await analyzeOperation(petstore as OASDocument, {
      method: 'post',
      path: '/pet',
      query: ['references'],
    });

    expect(analysis).toStrictEqual({
      references: expect.any(Object),
    });
  });

  it('should scope `references` down to just what the operation (and anything it references) uses', async () => {
    const analysis = await analyzeOperation(petstore as OASDocument, { method: 'post', path: '/pet' });

    expect(analysis.references).toStrictEqual({
      present: true,
      locations: [
        '#/components/requestBodies/Pet/content/application~1json/schema',
        '#/components/requestBodies/Pet/content/application~1xml/schema',
        '#/components/schemas/Pet/properties/category',
        '#/components/schemas/Pet/properties/tags/items',
        '#/paths/~1pet/post/requestBody',
      ],
    });
  });

  it('should scope `securityTypes` down to just the scheme that the operation uses', async () => {
    const addPet = await analyzeOperation(petstore as OASDocument, { method: 'post', path: '/pet' });
    expect(addPet.securityTypes?.found).toStrictEqual(['oauth2']);

    const getPetById = await analyzeOperation(petstore as OASDocument, { method: 'get', path: '/pet/{petId}' });
    expect(getPetById.securityTypes?.found).toStrictEqual(['apiKey']);
  });

  it('should report an operation total of 1, since a scoped analysis is only ever one operation', async () => {
    const analysis = await analyzeOperation(petstore as OASDocument, { method: 'post', path: '/pet' });
    expect(analysis.operationTotal?.found).toBe(1);
  });

  it('should not require the definition to be reduced down first', async () => {
    const analysis = await analyzeOperation(petstore as OASDocument, { method: 'get', path: '/store/inventory' });

    expect(analysis.references?.present).toBe(false);
    expect(analysis.securityTypes?.found).toStrictEqual(['apiKey']);
  });

  it('should throw for an operation that does not exist', async () => {
    await expect(analyzeOperation(petstore as OASDocument, { method: 'get', path: '/nope' })).rejects.toThrow(
      'Path `/nope` not found.',
    );
  });

  it('should analyze an operation whose Path Item is a `$ref`', async () => {
    const definition = {
      openapi: '3.1.0',
      info: { title: 'path item ref', version: '1.0.0' },
      paths: {
        '/pets/{petId}': {
          $ref: '#/components/pathItems/petById',
        },
      },
      components: {
        securitySchemes: {
          apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        },
        schemas: {
          Pet: { type: 'object' },
        },
        pathItems: {
          petById: {
            get: {
              security: [{ apiKey: [] }],
              responses: {
                200: {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Pet' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as OASDocument;

    const analysis = await analyzeOperation(definition, { method: 'get', path: '/pets/{petId}' });

    expect(analysis.operationTotal?.found).toBe(1);
    expect(analysis.securityTypes?.found).toStrictEqual(['apiKey']);
    expect(analysis.references).toStrictEqual({
      present: true,
      locations: ['#/components/pathItems/petById/get/responses/200/content/application~1json/schema'],
    });
  });

  it('should analyze an operation reached through a chained or percent-encoded Path Item `$ref`', async () => {
    const definition = {
      openapi: '3.1.0',
      info: { title: 'indirect path item ref', version: '1.0.0' },
      paths: {
        '/pets/{petId}': {
          $ref: '#/components/pathItems/pet%20ById%20Alias',
        },
      },
      components: {
        schemas: {
          Pet: { type: 'object' },
        },
        pathItems: {
          'pet ById Alias': {
            $ref: '#/components/pathItems/pet%20ById',
          },
          'pet ById': {
            get: {
              responses: {
                200: {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Pet' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as OASDocument;

    const analysis = await analyzeOperation(definition, {
      method: 'get',
      path: '/pets/{petId}',
      query: ['references'],
    });

    expect(analysis.references).toStrictEqual({
      present: true,
      locations: ['#/components/pathItems/pet ById/get/responses/200/content/application~1json/schema'],
    });
  });

  it('should analyze an operation defined within OpenAPI 3.2 `additionalOperations`', async () => {
    const analysis = await analyzeOperation(additionalOperationsSpec as OASDocument, {
      method: 'COPY',
      path: '/files/{id}',
      query: ['references', 'securityTypes', 'operationTotal'],
    });

    expect(analysis).toStrictEqual({
      references: {
        present: true,
        locations: [
          '#/components/responses/Copied/content/application~1json/schema',
          '#/components/schemas/CopyEvent/properties/source',
          '#/paths/~1files~1{id}/additionalOperations/COPY/parameters/0',
          '#/paths/~1files~1{id}/additionalOperations/COPY/responses/201',
          '#/paths/~1files~1{id}/parameters/0',
        ],
      },
      securityTypes: {
        name: 'Security Type',
        found: [],
      },
      operationTotal: {
        name: 'Operation',
        found: 1,
      },
    });

    // Only `LOCK` uses the `LockToken` security scheme so it should not be reported for `COPY`
    // but should be for `LOCK`.
    const lockAnalysis = await analyzeOperation(additionalOperationsSpec as OASDocument, {
      method: 'lock',
      path: '/files/{id}',
      query: ['securityTypes'],
    });

    expect(lockAnalysis.securityTypes).toStrictEqual({
      name: 'Security Type',
      found: ['apiKey'],
    });
  });

  it('should report `callbacks` defined on an OpenAPI 3.2 `additionalOperations` operation', async () => {
    const definition = {
      openapi: '3.2.0',
      info: { title: 'Callbacks in `additionalOperations`', version: '1.0.0' },
      paths: {
        '/files': {
          additionalOperations: {
            COPY: {
              callbacks: {
                onCopied: {
                  '{$request.body#/callbackUrl}': {
                    post: { responses: { 200: { description: 'OK' } } },
                  },
                },
              },
              responses: { 202: { description: 'Accepted' } },
            },
          },
        },
      },
    } as OASDocument;

    const analysis = await analyzeOperation(definition, {
      method: 'COPY',
      path: '/files',
      query: ['callbacks'],
    });

    expect(analysis.callbacks).toStrictEqual({
      present: true,
      locations: ['#/paths/~1files/additionalOperations/COPY/callbacks'],
    });
  });
});

describe('#analyzer() query selection', () => {
  it('should support querying for webhooks independently of xmlSchemas', async () => {
    const webhooksOnly = await analyzer(webhooksSpec as unknown as OASDocument, ['webhooks']);

    expect(webhooksOnly).toStrictEqual({
      webhooks: {
        present: true,
        locations: ['#/webhooks/newPet'],
      },
    });

    const xmlOnly = await analyzer(webhooksSpec as unknown as OASDocument, ['xmlSchemas']);

    expect(xmlOnly).toStrictEqual({
      xmlSchemas: {
        present: false,
        locations: [],
      },
    });
    expect(xmlOnly).not.toHaveProperty('webhooks');
  });
});

describe('#analyzeWebhookOperation()', () => {
  it('should query for everything by default', async () => {
    const analysis = await analyzeWebhookOperation(webhooksSpec as unknown as OASDocument, {
      webhookName: 'newPet',
      method: 'post',
    });

    expect(analysis).toMatchSnapshot();
  });

  it('should support supplying a specific query', async () => {
    const analysis = await analyzeWebhookOperation(webhooksSpec as unknown as OASDocument, {
      webhookName: 'newPet',
      method: 'post',
      query: ['references'],
    });

    expect(analysis).toStrictEqual({
      references: expect.any(Object),
    });
  });

  it('should scope `references` down to just what the webhook operation uses', async () => {
    const analysis = await analyzeWebhookOperation(webhooksSpec as unknown as OASDocument, {
      webhookName: 'newPet',
      method: 'post',
    });

    expect(analysis.references).toStrictEqual({
      present: true,
      locations: ['#/webhooks/newPet/post/requestBody/content/application~1json/schema'],
    });

    expect(analysis.webhooks).toStrictEqual({
      present: true,
      locations: ['#/webhooks/newPet'],
    });
  });

  it('should throw for a webhook that does not exist', async () => {
    await expect(
      analyzeWebhookOperation(webhooksSpec as unknown as OASDocument, { webhookName: 'nope', method: 'post' }),
    ).rejects.toThrow('Webhook `nope` not found.');
  });

  it('should support OpenAPI 3.2 definitions', async () => {
    const analysis = await analyzeWebhookOperation(webhooks32Spec as unknown as OASDocument, {
      webhookName: 'newPet',
      method: 'post',
      query: ['references', 'webhooks'],
    });

    expect(analysis).toStrictEqual({
      references: {
        present: true,
        locations: ['#/webhooks/newPet/post/requestBody/content/application~1json/schema'],
      },
      webhooks: {
        present: true,
        locations: ['#/webhooks/newPet'],
      },
    });
  });

  it('should analyze a webhook operation defined within OpenAPI 3.2 `additionalOperations`', async () => {
    const analysis = await analyzeWebhookOperation(additionalOperationsSpec as OASDocument, {
      webhookName: 'fileCopied',
      method: 'NOTIFY',
      query: ['references', 'webhooks'],
    });

    expect(analysis).toStrictEqual({
      references: {
        present: true,
        locations: [
          '#/components/schemas/CopyEvent/properties/source',
          '#/webhooks/fileCopied/additionalOperations/NOTIFY/requestBody/content/application~1json/schema',
        ],
      },
      webhooks: {
        present: true,
        locations: ['#/webhooks/fileCopied'],
      },
    });
  });

  it('should throw when the definition is not OpenAPI 3.1 or 3.2', async () => {
    await expect(
      analyzeWebhookOperation(petstore as OASDocument, { webhookName: 'newPet', method: 'post' }),
    ).rejects.toThrow('The supplied definition is not a OpenAPI 3.1 or 3.2 definition.');
  });
});
