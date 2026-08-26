import petstoreSwagger from '@readme/oas-examples/2.0/json/petstore.json' with { type: 'json' };
import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import {
  getAPIDefinitionType,
  getType,
  isAPIDefinition,
  isOpenAPI,
  isPostman,
  isSwagger,
} from '../../src/lib/utils.js';
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

  it('should not identify a non-API definition as one', () => {
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

describe('#getType()', () => {
  it('should identify a Buffer', () => {
    expect(getType(Buffer.from('{"openapi":"3.0.0"}'))).toBe('buffer');
  });

  it('should identify an in-memory object as JSON', () => {
    expect(getType({ openapi: '3.0.0' })).toBe('json');
  });

  it('should identify a stringified JSON object', () => {
    expect(getType('{"openapi":"3.0.0"}')).toBe('string-json');
    expect(getType('  {\n  "openapi": "3.0.0"\n}')).toBe('string-json');
  });

  it('should identify multiline YAML as a YAML string', () => {
    expect(getType('openapi: 3.0.0\ninfo:\n  title: Test\n')).toBe('string-yaml');
  });

  it('should identify HTTP(S) URLs', () => {
    expect(getType('https://example.com/openapi.json')).toBe('url');
    expect(getType('http://example.com/openapi.json')).toBe('url');
  });

  it('should identify local paths, including single-line strings that are not JSON', () => {
    expect(getType('./petstore.json')).toBe('path');
    expect(getType('/tmp/petstore.yaml')).toBe('path');
    // A single-line YAML document has no `{` and no newline, so the heuristic treats it as a path.
    expect(getType('openapi: 3.0.0')).toBe('path');
  });

  it('should return false for unrecognized values', () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined
    expect(getType(undefined)).toBe(false);
    expect(getType(42)).toBe(false);
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
