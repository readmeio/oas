import { beforeAll, test, expect } from 'vitest';

import Oas from '../../../src/index.js';

let readmeExtensions: Oas;
let requestExamples: Oas;
let trainTravel: Oas;

beforeAll(async () => {
  readmeExtensions = await import('@readme/oas-examples/3.0/json/readme-extensions.json')
    .then(r => r.default)
    .then(Oas.init);
  await readmeExtensions.dereference();

  requestExamples = await import('@readme/oas-examples/3.0/json/request-examples.json')
    .then(r => r.default)
    .then(Oas.init);
  await requestExamples.dereference();

  trainTravel = await import('@readme/oas-examples/3.1/json/train-travel.json').then(r => r.default).then(Oas.init);
  await trainTravel.dereference();
});

test('body and path param examples with matching response examples', () => {
  const operation = requestExamples.operation('/parameterExamples/{param1}/{param2}', 'patch');
  const pairs = operation.getExampleGroups();
  expect(pairs).toMatchSnapshot();
});

test('body param examples with matching response examples', () => {
  const operation = trainTravel.operation('/bookings/{bookingId}/payment', 'post');
  const pairs = operation.getExampleGroups();
  expect(pairs).toMatchSnapshot();
});

test('body param examples with matching response examples (primitive)', () => {
  const operation = requestExamples.operation('/requestBody-primitive-example', 'patch');
  const pairs = operation.getExampleGroups();
  expect(pairs).toMatchSnapshot();
  expect(pairs.cat.request.body).toBeTypeOf('string');
  expect(pairs.cat.response.mediaTypeExample.value).toBeTypeOf('string');
});

test('path param examples with matching response examples', () => {
  const operation = requestExamples.operation('/parameterExamples/{param1}/{param2}', 'get');
  const pairs = operation.getExampleGroups();
  expect(pairs).toMatchSnapshot();
});

test('custom code samples with matching response examples', () => {
  const operation = readmeExtensions.operation('/x-code-samples', 'post');
  const pairs = operation.getExampleGroups();
  expect(pairs).toMatchSnapshot();
});

test('custom code samples with no matching response examples', () => {
  const operation = readmeExtensions.operation('/x-code-samples', 'get');
  const pairs = operation.getExampleGroups();
  expect(pairs).toMatchSnapshot();
});

test('body param example with no title to match responses against', () => {
  const operation = trainTravel.operation('/bookings', 'post');
  const pairs = operation.getExampleGroups();
  expect(pairs).toStrictEqual({});
});

test('invalid operation', () => {
  const operation = trainTravel.operation('/invalid', 'patch');
  const pairs = operation.getExampleGroups();
  expect(pairs).toStrictEqual({});
});
