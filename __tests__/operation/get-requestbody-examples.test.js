const Oas = require('../../src');
const example = require('../__datasets__/operation-examples.json');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');
const exampleRoWo = require('../__datasets__/readonly-writeonly.json');
const cleanStringify = require('../../src/lib/json-stringify-clean');

const oas = new Oas(example);
const oas2 = new Oas(petstore);

beforeAll(async () => {
  await oas.dereference();
  await oas2.dereference();
});

test('should return early if there is no request body', () => {
  const operation = oas.operation('/none', 'get');
  expect(operation.getRequestBodyExamples()).toStrictEqual([]);
});

test('should support */* media types', () => {
  const operation = oas.operation('/wildcard-media-type', 'post');
  expect(operation.getRequestBodyExamples()).toStrictEqual([
    {
      code: cleanStringify({
        id: 12343354,
        email: 'test@example.com',
        name: 'Test user name',
      }),
      mediaType: '*/*',
      multipleExamples: false,
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
        code: cleanStringify({
          id: 0,
          name: 'string',
        }),
        mediaType: 'application/json',
        multipleExamples: false,
      },
    ]);
  });

  it('should generate examples if none are readily available', () => {
    const operation = oas2.operation('/pet/{petId}', 'post');
    expect(operation.getRequestBodyExamples()).toStrictEqual([
      {
        code: cleanStringify({
          name: 'string',
          status: 'string',
        }),
        mediaType: 'application/x-www-form-urlencoded',
        multipleExamples: false,
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
          code: cleanStringify(userExample),
          mediaType: 'application/json',
          multipleExamples: false,
        },
      ]);
    });

    it('should transform a $ref in a singular example', () => {
      const operation = oas.operation('/single-media-type-single-example-in-example-prop-with-ref', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          code: cleanStringify({
            value: userExample,
          }),
          mediaType: 'application/json',
          multipleExamples: false,
        },
      ]);
    });

    it('should not fail if the example is a string', () => {
      const operation = oas.operation('/single-media-type-single-example-in-example-prop-thats-a-string', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          code: 'column1,column2,column3,column4',
          mediaType: 'application/json',
          multipleExamples: false,
        },
      ]);
    });
  });

  describe('`examples`', () => {
    it('should return examples', () => {
      const operation = oas.operation('/examples-at-mediaType-level', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          code: cleanStringify({
            user: {
              id: 12343354,
              email: 'test@example.com',
              name: 'Test user name',
            },
          }),
          mediaType: 'application/json',
          multipleExamples: false,
        },
      ]);
    });

    it('should return examples if there are examples for the operation, and one of the examples is a $ref', () => {
      const operation = oas.operation('/ref-examples', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          code: 'string',
          mediaType: 'text/plain',
          multipleExamples: false,
        },
        {
          code: cleanStringify({
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
          }),
          mediaType: 'application/json',
          multipleExamples: false,
        },
      ]);
    });

    it('should not fail if the example is a string', () => {
      const operation = oas.operation('/single-media-type-single-example-in-examples-prop-that-are-strings', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          code: cleanStringify({
            name: 'Fluffy',
            petType: 'Cat',
          }),
          mediaType: 'application/json',
          multipleExamples: false,
        },
      ]);
    });

    it('should not fail if the example is an array', () => {
      const operation = oas.operation('/single-media-type-single-example-in-examples-prop-that-are-arrays', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          code: cleanStringify([
            {
              name: 'Fluffy',
              petType: 'Cat',
            },
          ]),
          mediaType: 'application/json',
          multipleExamples: false,
        },
      ]);
    });

    it('should return multiple nested examples if there are multiple media types types for the operation', () => {
      const operation = oas.operation('/multi-media-types-multiple-examples', 'post');
      expect(operation.getRequestBodyExamples()).toStrictEqual([
        {
          code: 'OK',
          mediaType: 'text/plain',
          multipleExamples: false,
        },
        {
          code: false,
          mediaType: 'application/json',
          multipleExamples: [
            {
              code: cleanStringify({
                name: 'Fluffy',
                petType: 'Cat',
              }),
              label: 'cat',
            },
            {
              code: cleanStringify({
                name: 'Puma',
                petType: 'Dog',
              }),
              label: 'dog',
            },
          ],
        },
      ]);
    });
  });
});

describe('readOnly / writeOnly handling', () => {
  it('should exclude `readOnly` schemas and include `writeOnly`', () => {
    const spec = new Oas(exampleRoWo);
    const operation = spec.operation('/', 'get');

    expect(operation.getRequestBodyExamples()).toStrictEqual([
      {
        code: cleanStringify({
          id: 'string',
          propWithWriteOnly: 'string',
        }),
        mediaType: 'application/json',
        multipleExamples: false,
      },
    ]);
  });
});
