import toBeAValidOpenAPIDefinition from '../src/index.js';
import invalid from './__fixtures__/invalid-oas.json' with { type: 'json' };
import valid from './__fixtures__/valid-oas.json' with { type: 'json' };

expect.extend({ toBeAValidOpenAPIDefinition });

test('should accept a valid OpenAPI', async () => {
  await expect(valid).toBeAValidOpenAPIDefinition();
});

test('should accept a valid OpenAPI with transformer', async () => {
  await expect(valid).toBeAValidOpenAPIDefinition(spec => {
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
