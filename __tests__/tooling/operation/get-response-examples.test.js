const Oas = require('../../../tooling');
const example = require('../__datasets__/operation-examples.json');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');
const cleanStringify = require('../../../tooling/lib/json-stringify-clean');

const oas = new Oas(example);
const oas2 = new Oas(petstore);

test('should return early if there is no response', async () => {
  const operation = oas.operation('/none', 'get');
  expect(await operation.getResponseExamples()).toStrictEqual([]);
});

describe('no curated examples present', () => {
  it('should not generate an example if there is no schema and an empty example', async () => {
    const operation = oas.operation('/emptyexample', 'post');
    expect(await operation.getResponseExamples()).toStrictEqual([]);
  });

  it('should generate examples if an `examples` property is present but empty', async () => {
    const operation = oas.operation('/emptyexample-with-schema', 'post');
    expect(await operation.getResponseExamples()).toStrictEqual([
      {
        languages: [
          {
            code: cleanStringify([
              {
                id: 0,
                name: 'string',
              },
            ]),
            language: 'application/json',
            multipleExamples: false,
          },
        ],
        status: '200',
      },
    ]);
  });

  it('should generate examples if none are readily available', async () => {
    const petExample = cleanStringify([
      {
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
    ]);

    const operation = oas2.operation('/pet/findByStatus', 'get');
    expect(await operation.getResponseExamples()).toStrictEqual([
      {
        languages: [
          {
            code: petExample,
            language: 'application/xml',
            multipleExamples: false,
          },
          {
            code: petExample,
            language: 'application/json',
            multipleExamples: false,
          },
        ],
        status: '200',
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
    it('should return examples', async () => {
      const operation = oas.operation('/single-media-type-single-example-in-example-prop', 'post');
      expect(await operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          languages: [
            {
              language: 'application/json',
              code: cleanStringify(userExample),
              multipleExamples: false,
            },
          ],
        },
      ]);
    });

    it('should transform a $ref in a singular example', async () => {
      const operation = oas.operation('/single-media-type-single-example-in-example-prop-with-ref', 'post');
      expect(await operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          languages: [
            {
              language: 'application/json',
              code: cleanStringify({
                value: userExample,
              }),
              multipleExamples: false,
            },
          ],
        },
      ]);
    });

    it('should not fail if the example is a string', async () => {
      const operation = oas.operation('/single-media-type-single-example-in-example-prop-thats-a-string', 'post');
      expect(await operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          languages: [
            {
              language: 'application/json',
              code: 'column1,column2,column3,column4',
              multipleExamples: false,
            },
          ],
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
    ])('%s', async (tc, operation) => {
      expect(await operation.getResponseExamples()).toStrictEqual([
        {
          languages: [
            {
              code: cleanStringify({
                user: {
                  email: 'test@example.com',
                  name: 'Test user name',
                },
              }),
              language: 'application/json',
              multipleExamples: false,
            },
          ],
          status: '200',
        },
        {
          languages: [
            {
              code:
                '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>',
              language: 'application/xml',
              multipleExamples: false,
            },
          ],
          status: '400',
        },
        {
          languages: [
            {
              code: cleanStringify({
                user: {
                  id: 12343354,
                  email: 'test@example.com',
                  name: 'Test user name',
                },
              }),
              language: 'application/json',
              multipleExamples: false,
            },
          ],
          status: 'default',
        },
      ]);
    });

    it('should not fail if the example is a string', async () => {
      const operation = oas.operation('/single-media-type-single-example-in-examples-prop-that-are-strings', 'post');

      expect(await operation.getResponseExamples()).toStrictEqual([
        {
          languages: [
            {
              code: cleanStringify({
                name: 'Fluffy',
                petType: 'Cat',
              }),
              language: 'application/json',
              multipleExamples: false,
            },
          ],
          status: '200',
        },
        {
          languages: [
            {
              code:
                '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>',
              language: 'application/xml',
              multipleExamples: false,
            },
          ],
          status: '400',
        },
      ]);
    });

    it('should not fail if the example is an array', async () => {
      const operation = oas.operation('/single-media-type-single-example-in-examples-prop-that-are-arrays', 'post');

      expect(await operation.getResponseExamples()).toStrictEqual([
        {
          languages: [
            {
              code: cleanStringify([
                {
                  name: 'Fluffy',
                  petType: 'Cat',
                },
              ]),
              language: 'application/json',
              multipleExamples: false,
            },
          ],
          status: '200',
        },
        {
          languages: [
            {
              code:
                '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>',
              language: 'application/xml',
              multipleExamples: false,
            },
          ],
          status: '400',
        },
      ]);
    });

    it('should return multiple nested examples if there are multiple media types types for the operation', async () => {
      const operation = oas.operation('/multi-media-types-multiple-examples', 'post');

      expect(await operation.getResponseExamples()).toStrictEqual([
        {
          status: '200',
          languages: [
            {
              language: 'text/plain',
              code: 'OK',
              multipleExamples: false,
            },
            {
              language: 'application/json',
              code: false,
              multipleExamples: [
                {
                  label: 'cat',
                  code: cleanStringify({
                    name: 'Fluffy',
                    petType: 'Cat',
                  }),
                },
                {
                  label: 'dog',
                  code: cleanStringify({
                    name: 'Puma',
                    petType: 'Dog',
                  }),
                },
              ],
            },
          ],
        },
        {
          status: '400',
          languages: [
            {
              language: 'application/xml',
              code:
                '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>',
              multipleExamples: false,
            },
          ],
        },
      ]);
    });
  });
});
