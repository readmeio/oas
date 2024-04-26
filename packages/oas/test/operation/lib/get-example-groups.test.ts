import { beforeAll, test, expect } from 'vitest';

import Oas from '../../../src/index.js';

let customExtensions: Oas;
let requestExamples: Oas;

beforeAll(async () => {
  customExtensions = await import('@readme/oas-examples/3.0/json/readme-extensions.json')
    .then(r => r.default)
    .then(Oas.init);
  await customExtensions.dereference();

  requestExamples = await import('@readme/oas-examples/3.0/json/request-examples.json')
    .then(r => r.default)
    .then(Oas.init);
  await requestExamples.dereference();
});

test('mixed', () => {
  const operation = requestExamples.operation('/parameterExamples/{param1}/{param2}', 'patch');
  const pairs = operation.getExampleGroups();
  expect(pairs).toMatchSnapshot();
});

test('custom code samples', () => {
  const operation = customExtensions.operation('/x-code-samples', 'post');
  const pairs = operation.getExampleGroups();
  expect(pairs).toMatchSnapshot();
});
