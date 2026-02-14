import readmeExtensionsSpec from '@readme/oas-examples/3.0/json/readme-extensions.json' with { type: 'json' };
import requestExamplesSpec from '@readme/oas-examples/3.0/json/request-examples.json' with { type: 'json' };
import trainTravelSpec from '@readme/oas-examples/3.1/json/train-travel.json' with { type: 'json' };
import { beforeAll, expect, test } from 'vitest';

import Oas from '../../../src/index.js';

let readmeExtensions: Oas;
let requestExamples: Oas;
let trainTravel: Oas;

beforeAll(() => {
  readmeExtensions = Oas.init(structuredClone(readmeExtensionsSpec));
  requestExamples = Oas.init(structuredClone(requestExamplesSpec));
  trainTravel = Oas.init(structuredClone(trainTravelSpec));
});

test('body/header/path/query param examples with matching response examples', () => {
  const operation = requestExamples.operation('/parameterExamples/{param1}/{param2}', 'patch');
  const groups = operation.getExampleGroups();

  expect(groups).toMatchSnapshot();
});

test('body param examples with matching response examples', () => {
  const operation = trainTravel.operation('/bookings/{bookingId}/payment', 'post');
  const groups = operation.getExampleGroups();

  expect(groups).toMatchSnapshot();
});

test('body param examples with matching response examples (primitive)', () => {
  const operation = requestExamples.operation('/requestBody-primitive-example', 'patch');
  const groups = operation.getExampleGroups();

  expect(groups).toMatchSnapshot();
  expect(groups.cat.request?.body).toBeTypeOf('string');
  expect(groups.cat.response?.mediaTypeExample.value).toBeTypeOf('string');
});

test('path param examples with matching response examples', () => {
  const operation = requestExamples.operation('/parameterExamples/{param1}/{param2}', 'get');
  const groups = operation.getExampleGroups();

  expect(groups).toMatchSnapshot();
});

test('form-urlencoded params with matching response example', () => {
  const operation = requestExamples.operation('/requestBody-form-data-example', 'post');
  const groups = operation.getExampleGroups();

  expect(groups).toMatchSnapshot();
});

test('custom code samples with matching response examples', () => {
  const operation = readmeExtensions.operation('/x-code-samples', 'post');
  const groups = operation.getExampleGroups();

  expect(groups).toMatchSnapshot();
});

test('custom code samples with no matching response examples', () => {
  const operation = readmeExtensions.operation('/x-code-samples', 'get');
  const groups = operation.getExampleGroups();

  expect(groups).toMatchSnapshot();
});

test('body param example with no title to match responses against', () => {
  const operation = trainTravel.operation('/bookings', 'post');
  const groups = operation.getExampleGroups();

  expect(groups).toStrictEqual({});
});

test('invalid operation', () => {
  const operation = trainTravel.operation('/invalid', 'patch');
  const groups = operation.getExampleGroups();

  expect(groups).toStrictEqual({});
});
