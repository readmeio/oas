import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import webhooksSpec from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import { beforeAll, describe, expect, it, test } from 'vitest';

import Oas from '../../../src/index.js';
import deprecatedSpec from '../../__datasets__/deprecated.json' with { type: 'json' };
import operationExamplesSpec from '../../__datasets__/operation-examples.json' with { type: 'json' };
import readonlyWriteonlySpec from '../../__datasets__/readonly-writeonly.json' with { type: 'json' };
import { jsonStringifyClean } from '../../__fixtures__/json-stringify-clean.js';

let operationExamples: Oas;
let petstore: Oas;
let webhooksOas: Oas;

beforeAll(() => {
  operationExamples = Oas.init(structuredClone(operationExamplesSpec));
  petstore = Oas.init(structuredClone(petstoreSpec));
  webhooksOas = Oas.init(structuredClone(webhooksSpec));
});

test('should return early if there is no request body', () => {
  const operation = operationExamples.operation('/nothing', 'get');

  expect(operation.getRequestBodyExamples()).toStrictEqual([]);
});

test('should re-intialize the request examples after the oas is dereferenced', async () => {
  const webhookOperation = webhooksOas.operation('newPet', 'post', { isWebhook: true });

  expect(webhookOperation.getRequestBodyExamples()).toStrictEqual([
    {
      mediaType: 'application/json',
      examples: [
        {
          value: undefined,
        },
      ],
    },
  ]);

  await webhookOperation.dereference();

  expect(webhookOperation.getRequestBodyExamples()).toStrictEqual([
    {
      mediaType: 'application/json',
      examples: [
        {
          value: {
            id: 0,
            name: 'string',
            tag: 'string',
          },
        },
      ],
    },
  ]);
});

test('should support */* media types', () => {
  const operation = operationExamples.operation('/wildcard-media-type', 'post');

  expect(operation.getRequestBodyExamples()).toStrictEqual([
    {
      mediaType: '*/*',
      examples: [
        {
          value: {
            id: 12343354,
            email: 'test@example.com',
            name: 'Test user name',
          },
        },
      ],
    },
  ]);
});

describe('no curated examples present', () => {
  it('should not generate an example if there is no schema and an empty example', () => {
    const operation = operationExamples.operation('/emptyexample', 'post');

    expect(operation.getRequestBodyExamples()).toStrictEqual([]);
  });

  it('should generate examples if an `examples` property is present but empty', async () => {
    const operation = operationExamples.operation('/emptyexample-with-schema', 'post');
    await operation.dereference();

    expect(operation.getRequestBodyExamples()).toStrictEqual([
      {
        mediaType: 'application/json',
        examples: [
          {
            value: {
              id: 0,
              name: 'string',
            },
          },
        ],
      },
    ]);
  });

  it('should generate examples if none are readily available', () => {
    const operation = petstore.operation('/pet/{petId}', 'post');

    expect(operation.getRequestBodyExamples()).toStrictEqual([
      {
        mediaType: 'application/x-www-form-urlencoded',
        examples: [
          {
            value: {
              name: 'string',
              status: 'string',
            },
          },
        ],
      },
    ]);
  });
});

describe('defined within response `content`', () => {
  const userExample = {
    id: 12343354,
    email: 'test@example.com',
    name: 'Test user name',
  };

  describe('`example`', () => {
    it('should return examples', () => {
      const operation = operationExamples.operation('/single-media-type-single-example-in-example-prop', 'post');

      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'application/json',
          examples: [
            {
              value: userExample,
            },
          ],
        },
      ]);
    });

    it('should transform a $ref in a singular example', async () => {
      const operation = operationExamples.operation(
        '/single-media-type-single-example-in-example-prop-with-ref',
        'post',
      );
      await operation.dereference();

      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'application/json',
          examples: [
            {
              value: {
                value: userExample,
              },
            },
          ],
        },
      ]);
    });

    it('should not fail if the example is a string', () => {
      const operation = operationExamples.operation(
        '/single-media-type-single-example-in-example-prop-thats-a-string',
        'post',
      );

      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'application/json',
          examples: [
            {
              value: 'column1,column2,column3,column4',
            },
          ],
        },
      ]);
    });
  });

  describe('`examples`', () => {
    it('should return examples', () => {
      const operation = operationExamples.operation('/examples-at-mediaType-level', 'post');

      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'application/json',
          examples: [
            {
              summary: 'userRegistration',
              title: 'userRegistration',
              value: {
                user: {
                  id: 12343354,
                  email: 'test@example.com',
                  name: 'Test user name',
                },
              },
            },
          ],
        },
      ]);
    });

    it('should return examples if there are examples for the operation, and one of the examples is a $ref', async () => {
      const operation = operationExamples.operation('/ref-examples', 'post');
      await operation.dereference();

      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'text/plain',
          examples: [
            {
              value: 'string',
            },
          ],
        },
        {
          mediaType: 'application/json',
          examples: [
            {
              summary: 'user',
              title: 'user',
              value: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
                  },
                  email: {
                    type: 'string',
                  },
                  name: {
                    type: 'string',
                  },
                },
                'x-readme-ref-name': 'user',
              },
            },
          ],
        },
      ]);
    });

    it('should not fail if the example is a string', () => {
      const operation = operationExamples.operation(
        '/single-media-type-single-example-in-examples-prop-that-are-strings',
        'post',
      );

      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'application/json',
          examples: [
            {
              summary: 'An example of a cat',
              title: 'cat',
              value: jsonStringifyClean({
                name: 'Fluffy',
                petType: 'Cat',
              }),
            },
          ],
        },
      ]);
    });

    it('should not fail if the example is an array', () => {
      const operation = operationExamples.operation(
        '/single-media-type-single-example-in-examples-prop-that-are-arrays',
        'post',
      );

      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'application/json',
          examples: [
            {
              summary: 'An example of a cat',
              title: 'cat',
              value: jsonStringifyClean([
                {
                  name: 'Fluffy',
                  petType: 'Cat',
                },
              ]),
            },
          ],
        },
      ]);
    });

    it('should return multiple nested examples if there are multiple media types types for the operation', () => {
      const operation = operationExamples.operation('/multi-media-types-multiple-examples', 'post');

      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'text/plain',
          examples: [
            {
              summary: 'response',
              title: 'response',
              value: 'OK',
            },
          ],
        },
        {
          mediaType: 'application/json',
          examples: [
            {
              summary: 'An example of a cat',
              title: 'cat',
              value: {
                name: 'Fluffy',
                petType: 'Cat',
              },
            },
            {
              summary: "An example of a dog with a cat's name",
              title: 'dog',
              value: {
                name: 'Puma',
                petType: 'Dog',
              },
            },
          ],
        },
      ]);
    });
  });
});

describe('readOnly / writeOnly handling', () => {
  let readonlyWriteonly: Oas;

  beforeAll(() => {
    readonlyWriteonly = Oas.init(structuredClone(readonlyWriteonlySpec));
  });

  it('should exclude `readOnly` schemas and include `writeOnly`', async () => {
    const operation = readonlyWriteonly.operation('/', 'put');
    await operation.dereference();

    expect(operation.getRequestBodyExamples()).toStrictEqual([
      {
        mediaType: 'application/json',
        examples: [
          {
            value: {
              id: 'string',
              propWithWriteOnly: 'string',
            },
          },
        ],
      },
    ]);
  });

  it('should retain `readOnly` and `writeOnly` settings when merging an allOf', async () => {
    const operation = readonlyWriteonly.operation('/allOf', 'post');
    await operation.dereference();

    const today = new Date().toISOString().substring(0, 10);

    expect(operation.getRequestBodyExamples()).toStrictEqual([
      {
        mediaType: 'application/json',
        examples: [
          {
            value: {
              end_date: today,
              product_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              start_date: today,
              writeOnly_primitive: 'string',
            },
          },
        ],
      },
    ]);
  });
});

describe('deprecated handling', () => {
  let deprecated: Oas;

  beforeAll(() => {
    deprecated = Oas.init(structuredClone(deprecatedSpec));
  });

  it('should include deprecated properties in examples', async () => {
    const operation = deprecated.operation('/', 'post');
    await operation.dereference();

    expect(operation.getRequestBodyExamples()).toStrictEqual([
      {
        mediaType: 'application/json',
        examples: [
          {
            value: {
              id: 0,
              name: 'string',
            },
          },
        ],
      },
    ]);
  });

  it('should pass through deprecated properties in examples on allOf schemas', async () => {
    const operation = deprecated.operation('/allof-schema', 'post');
    await operation.dereference();

    expect(operation.getRequestBodyExamples()).toStrictEqual([
      {
        mediaType: 'application/json',
        examples: [
          {
            value: {
              id: 0,
              name: 'string',
              category: 'string',
            },
          },
        ],
      },
    ]);
  });
});
