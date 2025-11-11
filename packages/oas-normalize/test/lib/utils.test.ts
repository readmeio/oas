import petstoreSwagger from '@readme/oas-examples/2.0/json/petstore.json' with { type: 'json' };
import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import { getAPIDefinitionType, isAPIDefinition, isOpenAPI, isPostman, isSwagger } from '../../src/lib/utils.js';
import postman from '../__fixtures__/postman/petstore.collection.json' with { type: 'json' };

describe('#isAPIDefinition() / #getAPIDefinitionType()', () => {
  it('should identify an OpenAPI definition', () => {
    expect(isAPIDefinition(petstore)).toBe(true);
    expect(getAPIDefinitionType(petstore)).toBe('openapi');
  });

  it('should identify a Postman definition', () => {
    expect(isAPIDefinition(postman)).toBe(true);
    expect(getAPIDefinitionType(postman)).toBe('postman');
  });

  it('should identify a Swagger definition', () => {
    expect(isAPIDefinition(petstoreSwagger)).toBe(true);
    expect(getAPIDefinitionType(petstoreSwagger)).toBe('swagger');
  });

  it('should not identify a non-API definition as one', async () => {
    const pkg = {
      name: 'not-an-api-definition',
      version: '0.0.0',
    };

    expect(isAPIDefinition(pkg)).toBe(false);
    expect(getAPIDefinitionType(pkg)).toBe('unknown');
  });
});

describe('#isOpenAPI()', () => {
  it('should identify an OpenAPI definition', () => {
    expect(isOpenAPI(petstore)).toBe(true);
  });

  it('should not misidentify a Swagger definition', () => {
    expect(isOpenAPI(petstoreSwagger)).toBe(false);
  });

  it('should not misidentify a Postman collection', () => {
    expect(isOpenAPI(postman)).toBe(false);
  });
});

describe('#isPostman()', () => {
  it('should identify a Postman collection', () => {
    expect(isPostman(postman)).toBe(true);
  });

  it('should not misidentify a Swagger definition', () => {
    expect(isPostman(petstoreSwagger)).toBe(false);
  });

  it('should not misidentify an OpenAPI', () => {
    expect(isPostman(petstore)).toBe(false);
  });
});

describe('#isSwagger()', () => {
  it('should identify a Swagger definition', () => {
    expect(isSwagger(petstoreSwagger)).toBe(true);
  });

  it('should not misidentify an OpenAPI definition', () => {
    expect(isSwagger(petstore)).toBe(false);
  });

  it('should not misidentify a Postman collection', () => {
    expect(isSwagger(postman)).toBe(false);
  });
});
