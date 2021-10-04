const Oas = require('../../src');
const operationExamples = require('../__datasets__/operation-examples.json');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');
const exampleRoWo = require('../__datasets__/readonly-writeonly.json');
const cleanStringify = require('../__fixtures__/json-stringify-clean');
const circular = require('../__datasets__/circular.json');

const oas = new Oas(operationExamples);
const oas2 = new Oas(petstore);

beforeAll(async () => {
  await oas.dereference();
  await oas2.dereference();
});

test('should handle if there are no responses', () => {
  const operation = oas.operation('/nothing', 'get');
  expect(operation.getResponseExamples()).toStrictEqual([]);
});

test('should handle if there are no response schemas', () => {
  const operation = oas.operation('/no-response-schemas', 'get');
  expect(operation.getResponseExamples()).toStrictEqual([]);
});

test('should support */* media types', () => {
  const operation = oas.operation('/wildcard-media-type', 'post');
  expect(operation.getResponseExamples()).toStrictEqual([
    {
      status: '200',
      mediaTypes: {
        '*/*': [
          {
            value: {
              id: 12343354,
              email: 'test@example.com',
              name: 'Test user name',
            },
          },
        ],
      },
    },
  ]);
});

test('should do its best at handling circular schemas', async () => {
  const circularOas = new Oas(circular);
  await circularOas.dereference();

  const operation = circularOas.operation('/', 'get');
  const examples = await operation.getResponseExamples();

  expect(examples).toHaveLength(1);

  // Though `offsetAfter` and `offsetBefore` are part of this schema, they're missing from the example because they're
  // a circular ref.
  //
  // We should replace our dereference work in Oas with `swagger-client` and its `.resolve()` method as it can better
  // handle circular references. For example, with the above schema dereferenced through it, we'll generate the
  // following example:
  //
  //  {
  //    dateTime: '2020-11-03T00:09:44.920Z',
  //    offsetAfter: { id: 'string', rules: { transitions: [ undefined ] } },
  //    offsetBefore: { id: 'string', rules: { transitions: [ undefined ] } }
  //  }
  expect(examples[0].mediaTypes['application/json']).toStrictEqual([
    {
      value: {
        dateTime: expect.any(String),
        offsetAfter: undefined,
        offsetBefore: undefined,
      },
    },
  ]);
});

describe('no curated examples present', () => {
  it('should not generate an example schema if there is no documented schema and an empty example', () => {
    const operation = oas.operation('/emptyexample', 'post');
    expect(operation.getResponseExamples()).toStrictEqual([
      {
        status: '200',
        mediaTypes: {
          'application/json': [],
        },
      },
    ]);
  });

  it('should generate examples if an `examples` property is present but empty', () => {
    const operation = oas.operation('/emptyexample-with-schema', 'post');
    expect(operation.getResponseExamples()).toStrictEqual([
      {
        status: '200',
        mediaTypes: {
          'application/json': [
            {
              value: [
                {
                  id: 0,
                  name: 'string',
                },
              ],
            },
          ],
        },
      },
    ]);
  });

  it('should generate examples if none are readily available', () => {
    const petExample = [
      {
        id: 0,
        category: {
          id: 0,
          name: 'string',
        },
        name: 'doggie',
        photoUrls: ['string'],
        tags: [
          {
            id: 0,
            name: 'string',
          },
        ],
        status: 'available',
      },
    ];

    const operation = oas2.operation('/pet/findByStatus', 'get');
    expect(operation.getResponseExamples()).toStrictEqual([
      {
        status: '200',
        mediaTypes: {
          // Though this operation responds with `application/json` and `application/xml`, since there aren't any
          // examples present we can only generate an example for the JSON response as what we generate is JSON, not
          // XML.
          'application/json': [
            {
              value: petExample,
            },
          ],
          'application/xml': [],
        },
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
      expect(operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          mediaTypes: {
            'application/json': [
              {
                value: userExample,
              },
            ],
          },
        },
      ]);
    });

    it('should transform a $ref in a singular example', () => {
      const operation = oas.operation('/single-media-type-single-example-in-example-prop-with-ref', 'post');
      expect(operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          mediaTypes: {
            'application/json': [
              {
                value: {
                  value: userExample,
                },
              },
            ],
          },
        },
      ]);
    });

    it('should not fail if the example is a string', () => {
      const operation = oas.operation('/single-media-type-single-example-in-example-prop-thats-a-string', 'post');
      expect(operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          mediaTypes: {
            'application/json': [
              {
                value: 'column1,column2,column3,column4',
              },
            ],
          },
        },
      ]);
    });
  });

  describe('`examples`', () => {
    it.each([
      ['should return examples', oas.operation('/examples-at-mediaType-level', 'post')],
      [
        'should return examples if there are examples for the operation, and one of the examples is a $ref',
        oas.operation('/ref-examples', 'post'),
      ],
    ])('%s', (tc, operation) => {
      expect(operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          mediaTypes: {
            'application/json': [
              {
                summary: 'response',
                title: 'response',
                value: {
                  user: {
                    email: 'test@example.com',
                    name: 'Test user name',
                  },
                },
              },
            ],
          },
        },
        {
          status: '400',
          mediaTypes: {
            'application/xml': [
              {
                summary: 'response',
                title: 'response',
                value:
                  '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>',
              },
            ],
          },
        },
        {
          status: 'default',
          mediaTypes: {
            'application/json': [
              {
                summary: 'response',
                title: 'response',
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
        },
      ]);
    });

    it('should not fail if the example is a string', () => {
      const operation = oas.operation('/single-media-type-single-example-in-examples-prop-that-are-strings', 'post');

      expect(operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          mediaTypes: {
            'application/json': [
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
        },
        {
          status: '400',
          mediaTypes: {
            'application/xml': [
              {
                summary: 'response',
                title: 'response',
                value:
                  '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>',
              },
            ],
          },
        },
      ]);
    });

    it('should not fail if the example is null', () => {
      const spec = new Oas({
        paths: {
          '/': {
            get: {
              responses: {
                500: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'string',
                      },
                    },
                    'application/x-json': { examples: { response: { value: null } } },
                  },
                },
              },
            },
          },
        },
      });

      expect(spec.operation('/', 'get').getResponseExamples()).toStrictEqual([
        {
          status: '500',
          mediaTypes: {
            'application/json': [
              {
                value: 'string',
              },
            ],
            'application/x-json': [
              {
                summary: 'response',
                title: 'response',
                value: null,
              },
            ],
          },
        },
      ]);
    });

    it('should not fail if the example is an array', () => {
      const operation = oas.operation('/single-media-type-single-example-in-examples-prop-that-are-arrays', 'post');

      expect(operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          mediaTypes: {
            'application/json': [
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
        },
        {
          status: '400',
          mediaTypes: {
            'application/xml': [
              {
                summary: 'response',
                title: 'response',
                value:
                  '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>',
              },
            ],
          },
        },
      ]);
    });

    it('should return multiple nested examples if there are multiple media types types for the operation', () => {
      const operation = oas.operation('/multi-media-types-multiple-examples', 'post');

      expect(operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          mediaTypes: {
            'text/plain': [
              {
                summary: 'response',
                title: 'response',
                value: 'OK',
              },
            ],
            'application/json': [
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
        },
        {
          status: '400',
          mediaTypes: {
            'application/xml': [
              {
                summary: 'response',
                title: 'response',
                value:
                  '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>',
              },
            ],
          },
        },
      ]);
    });
  });
});

describe('readOnly / writeOnly handling', () => {
  it('should include `readOnly` schemas and exclude `writeOnly`', () => {
    const spec = new Oas(exampleRoWo);
    const operation = spec.operation('/', 'get');

    expect(operation.getResponseExamples()).toStrictEqual([
      {
        status: '200',
        mediaTypes: {
          'application/json': [
            {
              value: {
                id: 'string',
                propWithReadOnly: 'string',
              },
            },
          ],
        },
      },
    ]);
  });

  it('should retain `readOnly` and `writeOnly` settings when merging an allOf', async () => {
    const spec = new Oas(exampleRoWo);
    await spec.dereference();

    const operation = spec.operation('/allOf', 'post');
    const today = new Date().toISOString().substring(0, 10);

    expect(operation.getResponseExamples()).toStrictEqual([
      {
        status: '200',
        mediaTypes: {
          'application/json': [
            {
              value: {
                end_date: today,
                end_hour: 'string',
                id: 'string',
                product_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                readOnly_primitive: 'string',
                start_date: today,
                start_hour: 'string',
              },
            },
          ],
        },
      },
    ]);
  });
});

test('sample generation should not corrupt the supplied operation', async () => {
  const spec = new Oas(exampleRoWo);
  await spec.dereference();

  const operation = spec.operation('/', 'post');
  const today = new Date().toISOString().substring(0, 10);

  // Running this before `getResponseExamples` should have no effects on the output of the `getResponseExamples` call.
  expect(operation.getRequestBodyExamples()).toStrictEqual([
    {
      mediaType: 'application/json',
      examples: [
        {
          value: {
            product_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            start_date: today,
            end_date: today,
          },
        },
      ],
    },
  ]);

  expect(operation.getResponseExamples()).toStrictEqual([
    {
      status: '201',
      mediaTypes: {
        'application/json': [
          {
            value: {
              id: 'string',
              product_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              start_date: today,
              end_date: today,
              start_hour: 'string',
              end_hour: 'string',
            },
          },
        ],
      },
    },
  ]);
});
