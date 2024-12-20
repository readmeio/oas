/* eslint-disable unicorn/prefer-module */
/* eslint-disable vitest/consistent-test-it */
import fs from 'node:fs/promises';

import swaggerJSON from '@readme/oas-examples/2.0/json/petstore.json';
import petstore30JSON from '@readme/oas-examples/3.0/json/petstore.json';
import petstore31JSON from '@readme/oas-examples/3.1/json/petstore.json';
import { bench, describe } from 'vitest';

import OASNormalize from '../../src/index.js';
import postmanJSON from '../__fixtures__/postman/petstore.collection.json';

describe('JSON', () => {
  bench('OpenAPI 3.1', async () => {
    const normalized = new OASNormalize(JSON.stringify(petstore30JSON));
    await normalized.validate();
  });

  bench('OpenAPI 3.0', async () => {
    const normalized = new OASNormalize(JSON.stringify(petstore31JSON));
    await normalized.validate();
  });

  bench('Swagger 2.0', async () => {
    const normalized = new OASNormalize(JSON.stringify(swaggerJSON));
    await normalized.validate();
  });

  bench('Postman', async () => {
    const normalized = new OASNormalize(JSON.stringify(postmanJSON));
    await normalized.validate();
  });
});

describe('YAML', async () => {
  const swaggerYAML = await fs.readFile(require.resolve('@readme/oas-examples/2.0/yaml/petstore.yaml'), 'utf8');
  const petstore30YAML = await fs.readFile(require.resolve('@readme/oas-examples/3.0/yaml/petstore.yaml'), 'utf8');
  const petstore31YAML = await fs.readFile(require.resolve('@readme/oas-examples/3.1/yaml/petstore.yaml'), 'utf8');
  const postmanYAML = await fs.readFile(require.resolve('../__fixtures__/postman/petstore.collection.yaml'), 'utf8');

  bench('OpenAPI 3.1', async () => {
    const normalized = new OASNormalize(petstore31YAML);
    await normalized.validate();
  });

  bench('OpenAPI 3.0', async () => {
    const normalized = new OASNormalize(petstore30YAML);
    await normalized.validate();
  });

  bench('Swagger 2.0', async () => {
    const normalized = new OASNormalize(swaggerYAML);
    await normalized.validate();
  });

  bench('Postman', async () => {
    const normalized = new OASNormalize(postmanYAML);
    await normalized.validate();
  });
});
