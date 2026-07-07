import type { OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import webhooksSpec from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import { analyzeOperation, analyzeWebhookOperation, analyzer } from '../../src/analyzer/index.js';

describe('#analyzer()', () => {
  it('should should analyzer an OpenAPI definition', async () => {
    await expect(analyzer(petstore as OASDocument)).resolves.toMatchSnapshot();
  });
});

describe('#analyzeOperation()', () => {
  it('should query for everything by defualt', async () => {
    const analysis = await analyzeOperation(petstore as OASDocument, {
      method: 'post',
      path: '/pet',
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
});

describe('#analyzeWebhookOperation()', () => {
  it('should query for everything by defualt', async () => {
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
});
