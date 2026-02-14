import type { HttpMethods } from '../../../src/types.js';

import { beforeEach, describe, expect, it } from 'vitest';

import Oas from '../../../src/index.js';
import callbacksSpec from '../../__datasets__/callbacks.json' with { type: 'json' };
import operationExamplesSpec from '../../__datasets__/operation-examples.json' with { type: 'json' };

describe('.getCallbackExamples()', () => {
  let operationExamples: Oas;
  let callbacks: Oas;

  beforeEach(() => {
    operationExamples = Oas.init(structuredClone(operationExamplesSpec));
    callbacks = Oas.init(structuredClone(callbacksSpec));
  });

  it('should handle if there are no callbacks', () => {
    const operation = operationExamples.operation('/nothing', 'get');

    expect(operation.getCallbackExamples()).toStrictEqual([]);
  });

  it('should handle if there are no callback schemas', () => {
    const operation = operationExamples.operation('/no-response-schemas', 'get');

    expect(operation.getCallbackExamples()).toStrictEqual([]);
  });

  describe('no curated examples present', () => {
    it('should not generate an example schema if there is no documented schema and an empty example', () => {
      const operation = operationExamples.operation('/emptyexample', 'post');

      expect(operation.getCallbackExamples()).toStrictEqual([
        {
          identifier: 'myCallback',
          expression: '{$request.query.queryUrl}',
          method: 'post',
          example: [
            {
              status: '200',
              mediaTypes: {
                'application/json': [],
              },
            },
          ],
        },
      ]);
    });

    it('should generate examples if an `examples` property is present but empty', async () => {
      const operation = operationExamples.operation('/emptyexample-with-schema', 'post');
      await operation.dereference();

      expect(operation.getCallbackExamples()).toStrictEqual([
        {
          identifier: 'myCallback',
          expression: '{$request.query.queryUrl}',
          method: 'post',
          example: [
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
          ],
        },
      ]);
    });
  });

  describe('`examples`', () => {
    it.each([
      ['should return examples', '/examples-at-mediaType-level', 'post'],
      [
        'should return examples if there are examples for the operation, and one of the examples is a $ref',
        '/ref-examples',
        'post',
      ],
    ])('%s', async (_, path, method) => {
      const operation = operationExamples.operation(path, method as HttpMethods);
      await operation.dereference();

      expect(operation.getCallbackExamples()).toStrictEqual([
        {
          identifier: 'myCallback',
          expression: '{$request.query.queryUrl}',
          method: 'post',
          example: [
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
          ],
        },
      ]);
    });

    it('should return multiple nested examples if there are multiple media types types for the operation', () => {
      const operation = operationExamples.operation('/multi-media-types-multiple-examples', 'post');

      expect(operation.getCallbackExamples()).toStrictEqual([
        {
          identifier: 'myCallback',
          expression: '{$request.query.queryUrl}',
          method: 'post',
          example: [
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
          ],
        },
      ]);
    });
  });

  it('should return examples for multiple expressions and methods within a callback', () => {
    const operation = callbacks.operation('/callbacks', 'get');

    expect(operation.getCallbackExamples()).toMatchSnapshot();
  });
});
