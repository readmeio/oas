import Oas from '../../src';
import cleanStringify from '../__fixtures__/json-stringify-clean';

let operationExamples: Oas;
let petstore: Oas;

beforeAll(async () => {
  operationExamples = await import('../__datasets__/operation-examples.json').then(r => r.default).then(Oas.init);
  await operationExamples.dereference();

  petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(r => r.default).then(Oas.init);
  await petstore.dereference();
});

test('should return early if there is no request body', () => {
  const operation = operationExamples.operation('/nothing', 'get');
  expect(operation.getRequestBodyExamples()).toStrictEqual([]);
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

  it('should generate examples if an `examples` property is present but empty', () => {
    const operation = operationExamples.operation('/emptyexample-with-schema', 'post');
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

    it('should transform a $ref in a singular example', () => {
      const operation = operationExamples.operation(
        '/single-media-type-single-example-in-example-prop-with-ref',
        'post'
      );

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
        'post'
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

    it('should return examples if there are examples for the operation, and one of the examples is a $ref', () => {
      const operation = operationExamples.operation('/ref-examples', 'post');
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
        'post'
      );

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
      const operation = operationExamples.operation(
        '/single-media-type-single-example-in-examples-prop-that-are-arrays',
        'post'
      );

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

  beforeAll(async () => {
    readonlyWriteonly = await import('../__datasets__/readonly-writeonly.json').then(r => r.default).then(Oas.init);
    await readonlyWriteonly.dereference();
  });

  it('should exclude `readOnly` schemas and include `writeOnly`', () => {
    const operation = readonlyWriteonly.operation('/', 'put');
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

  it('should retain `readOnly` and `writeOnly` settings when merging an allOf', () => {
    const operation = readonlyWriteonly.operation('/allOf', 'post');
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

  beforeAll(async () => {
    deprecated = await import('../__datasets__/deprecated.json').then(r => r.default).then(Oas.init);
    await deprecated.dereference();
  });

  it('should include deprecated properties in examples', () => {
    const operation = deprecated.operation('/', 'post');
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

  it('should pass through deprecated properties in examples on allOf schemas', () => {
    const operation = deprecated.operation('/allof-schema', 'post');
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
