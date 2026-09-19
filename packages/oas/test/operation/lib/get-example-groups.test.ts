import readmeExtensionsSpec from '@readme/oas-examples/3.0/json/readme-extensions.json' with { type: 'json' };
import requestExamplesSpec from '@readme/oas-examples/3.0/json/request-examples.json' with { type: 'json' };
import trainTravelSpec from '@readme/oas-examples/3.1/json/train-travel.json' with { type: 'json' };
import { beforeAll, describe, expect, it } from 'vitest';

import Oas from '../../../src/index.js';

describe('.getExampleGroups()', () => {
  let readmeExtensions: Oas;
  let requestExamples: Oas;
  let trainTravel: Oas;

  beforeAll(() => {
    readmeExtensions = Oas.init(structuredClone(readmeExtensionsSpec));
    requestExamples = Oas.init(structuredClone(requestExamplesSpec));
    trainTravel = Oas.init(structuredClone(trainTravelSpec));
  });

  it('body/header/path/query param examples with matching response examples', () => {
    const operation = requestExamples.operation('/parameterExamples/{param1}/{param2}', 'patch');
    const groups = operation.getExampleGroups();

    expect(groups).toMatchSnapshot();
  });

  it('body param examples with matching response examples', () => {
    const operation = trainTravel.operation('/bookings/{bookingId}/payment', 'post');
    const groups = operation.getExampleGroups();

    expect(groups).toMatchSnapshot();
  });

  it('body param examples with matching response examples (primitive)', () => {
    const operation = requestExamples.operation('/requestBody-primitive-example', 'patch');
    const groups = operation.getExampleGroups();

    expect(groups).toMatchSnapshot();
    expect(groups.cat.request?.body).toBeTypeOf('string');
    expect(groups.cat.response?.mediaTypeExample.value).toBeTypeOf('string');
  });

  it('path param examples with matching response examples', () => {
    const operation = requestExamples.operation('/parameterExamples/{param1}/{param2}', 'get');
    const groups = operation.getExampleGroups();

    expect(groups).toMatchSnapshot();
  });

  it('form-urlencoded params with matching response example', () => {
    const operation = requestExamples.operation('/requestBody-form-data-example', 'post');
    const groups = operation.getExampleGroups();

    expect(groups).toMatchSnapshot();
  });

  it('custom code samples with matching response examples', () => {
    const operation = readmeExtensions.operation('/x-code-samples', 'post');
    const groups = operation.getExampleGroups();

    expect(groups).toMatchSnapshot();
  });

  it('custom code samples with no matching response examples', () => {
    const operation = readmeExtensions.operation('/x-code-samples', 'get');
    const groups = operation.getExampleGroups();

    expect(groups).toMatchSnapshot();
  });

  it('body param example with no title to match responses against', () => {
    const operation = trainTravel.operation('/bookings', 'post');
    const groups = operation.getExampleGroups();

    expect(groups).toStrictEqual({});
  });

  it('should keep a parameter example `$ref` that resolves to a falsy primitive', () => {
    const oas = Oas.init({
      openapi: '3.1.0',
      info: { title: 'example ref', version: '1.0.0' },
      paths: {
        '/items': {
          get: {
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer' },
                examples: {
                  zero: { $ref: '#/components/examples/Zero/value' },
                },
              },
            ],
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    examples: {
                      zero: { value: [] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        examples: {
          Zero: { value: 0 },
        },
      },
    });

    expect(oas.operation('/items', 'get').getExampleGroups().zero.request?.query?.limit).toBe(0);
  });

  it('invalid operation', () => {
    const operation = trainTravel.operation('/invalid', 'patch');
    const groups = operation.getExampleGroups();

    expect(groups).toStrictEqual({});
  });
});
