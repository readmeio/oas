import * as RMOAS from '../../src/rmoas.types';
import Oas from '../../src';
import operationExamples from '../__datasets__/operation-examples.json';
import petstore from '@readme/oas-examples/3.0/json/petstore.json';
import exampleRoWo from '../__datasets__/readonly-writeonly.json';
import deprecated from '../__datasets__/deprecated.json';

import cleanStringify from '../__fixtures__/json-stringify-clean';

const oas = new Oas(operationExamples as RMOAS.OASDocument);
const oas2 = new Oas(petstore as RMOAS.OASDocument);

beforeAll(async () => {
  await oas.dereference();
  await oas2.dereference();
});

test('should return early if there is no request body', () => {
  const operation = oas.operation('/nothing', 'get');
  expect(operation.getRequestBodyExamples()).toStrictEqual([]);
});

test('should support */* media types', () => {
  const operation = oas.operation('/wildcard-media-type', 'post');

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
    const operation = oas.operation('/emptyexample', 'post');
    expect(operation.getRequestBodyExamples()).toStrictEqual([]);
  });

  it('should generate examples if an `examples` property is present but empty', () => {
    const operation = oas.operation('/emptyexample-with-schema', 'post');
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
    const operation = oas2.operation('/pet/{petId}', 'post');
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
      const operation = oas.operation('/single-media-type-single-example-in-example-prop', 'post');
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

    it('should transform a $ref in a singular example', () => {
      const operation = oas.operation('/single-media-type-single-example-in-example-prop-with-ref', 'post');
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
      const operation = oas.operation('/single-media-type-single-example-in-example-prop-thats-a-string', 'post');
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
      const operation = oas.operation('/examples-at-mediaType-level', 'post');
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

    it('should return examples if there are examples for the operation, and one of the examples is a $ref', () => {
      const operation = oas.operation('/ref-examples', 'post');
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
      const operation = oas.operation('/single-media-type-single-example-in-examples-prop-that-are-strings', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'application/json',
          examples: [
            {
              summary: 'An example of a cat',
              title: 'cat',
              value: cleanStringify({
                name: 'Fluffy',
                petType: 'Cat',
              }),
            },
          ],
        },
      ]);
    });

    it('should not fail if the example is an array', () => {
      const operation = oas.operation('/single-media-type-single-example-in-examples-prop-that-are-arrays', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          mediaType: 'application/json',
          examples: [
            {
              summary: 'An example of a cat',
              title: 'cat',
              value: cleanStringify([
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
      const operation = oas.operation('/multi-media-types-multiple-examples', 'post');
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
  it('should exclude `readOnly` schemas and include `writeOnly`', () => {
    const spec = new Oas(exampleRoWo as RMOAS.OASDocument);
    const operation = spec.operation('/', 'put');

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
    const spec = new Oas(exampleRoWo as RMOAS.OASDocument);
    await spec.dereference();

    const operation = spec.operation('/allOf', 'post');
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
  it('should include deprecated properties in examples', async () => {
    const spec = new Oas(deprecated as RMOAS.OASDocument);
    await spec.dereference();

    const operation = spec.operation('/', 'post');
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
    const spec = new Oas(deprecated as RMOAS.OASDocument);
    await spec.dereference();

    const operation = spec.operation('/allof-schema', 'post');
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
