import { test, expect } from 'vitest';

import { openapi } from '../src';

function isJsonSchemaDraft4(obj: unknown) {
  expect(obj).toBeTypeOf('object');
  expect(obj).toHaveProperty('id');
  expect(obj).toHaveProperty('$schema');
  expect(obj).toHaveProperty('properties');
  expect(obj).toHaveProperty('definitions');
  return true;
}

function isJsonSchemaDraft202012(obj: unknown) {
  expect(obj).toBeTypeOf('object');
  expect(obj).toHaveProperty('$id');
  expect(obj).toHaveProperty('$schema');
  expect(obj).toHaveProperty('properties');
  expect(obj).toHaveProperty('$defs');
  return true;
}

test('should export the Swagger v1.2 schema', () => {
  expect(openapi.v1).toSatisfy(isJsonSchemaDraft4);
  expect(openapi.v1.properties.swaggerVersion.enum).toStrictEqual(['1.2']);
});

test('should export the Swagger v2 schema', () => {
  expect(openapi.v2).toSatisfy(isJsonSchemaDraft4);
  expect(openapi.v2.properties.swagger.enum).toStrictEqual(['2.0']);
});

test('should export the OpenAPI v3 schema', () => {
  expect(openapi.v3).toSatisfy(isJsonSchemaDraft4);
  expect(openapi.v3.properties.openapi.pattern).toBe('^3\\.0\\.\\d(-.+)?$');
});

test('should export the OpenAPI v3.1 schema', () => {
  expect(openapi.v31).toSatisfy(isJsonSchemaDraft202012);
  expect(openapi.v31.properties.openapi.pattern).toBe('^3\\.1\\.\\d+(-.+)?$');
});

test('should export a legacy OpenAPI v3.1 schema without a `$dynamicRef` on `header.schema`', () => {
  expect(openapi.v31legacy).toSatisfy(isJsonSchemaDraft202012);
  expect(openapi.v31legacy.$defs.header.properties.schema).toStrictEqual({ type: ['object', 'boolean'] });
});

test('should export the OpenAPI v3.2 schema', () => {
  expect(openapi.v32).toSatisfy(isJsonSchemaDraft202012);
  expect(openapi.v32.properties.openapi.pattern).toBe('^3\\.2\\.\\d+(-.+)?$');
});

test('should export a legacy OpenAPI v3.2 schema without a `$dynamicRef` on `header.schema`', () => {
  expect(openapi.v32legacy).toSatisfy(isJsonSchemaDraft202012);
  expect(openapi.v32legacy.$defs.header.properties.schema).toStrictEqual({ type: ['object', 'boolean'] });
});
