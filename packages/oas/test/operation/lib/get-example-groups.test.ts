import { beforeAll, test, expect } from 'vitest';

import Oas from '../../../src/index.js';

let exampleGroups: Oas;
let readmeExtensions: Oas;
let requestExamples: Oas;
let trainTravel: Oas;

beforeAll(async () => {
  // @todo: once this is updated in oas-examples repo, use that instead of this fixture
  exampleGroups = await import('../../__datasets__/example-groups.json').then(r => r.default).then(Oas.init);
  await exampleGroups.dereference();

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

test('body/header/path/query param examples with matching response examples', () => {
  // @todo: once this is updated in oas-examples repo, use that instead of this fixture
  const operation = exampleGroups.operation('/parameterExamples/{param1}/{param2}', 'patch');
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
  expect(groups.cat.request.body).toBeTypeOf('string');
  expect(groups.cat.response.mediaTypeExample.value).toBeTypeOf('string');
});

test('path param examples with matching response examples', () => {
  const operation = requestExamples.operation('/parameterExamples/{param1}/{param2}', 'get');
  const groups = operation.getExampleGroups();
  expect(groups).toMatchSnapshot();
});

test('form-urlencoded params with matching response example', () => {
  // @todo: once this is updated in oas-examples repo, use that instead of this fixture
  const operation = exampleGroups.operation('/form-data', 'post');
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
