import toBeAValidOpenAPIDefinition from '../src';

import invalid from './__fixtures__/invalid-oas.json';
import valid from './__fixtures__/valid-oas.json';

expect.extend({ toBeAValidOpenAPIDefinition });

test('should accept a valid OpenAPI', async () => {
  await expect(valid).toBeAValidOpenAPIDefinition();
});

test('should accept a valid OpenAPI with transformer', async () => {
  await expect(valid).toBeAValidOpenAPIDefinition((spec: Record<string, string>) => {
    // eslint-disable-next-line no-param-reassign
    spec.openapi = '3.1.0';
    return spec;
  });
});

test('should reject an invalid OpenAPI', async () => {
  await expect(invalid).not.toBeAValidOpenAPIDefinition();
});

test('should reject yet another invalid OpenAPI', async () => {
  await expect({}).not.toBeAValidOpenAPIDefinition();
});
