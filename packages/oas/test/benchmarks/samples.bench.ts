import type { HttpMethods, OASDocument } from '../../src/types.js';

import { describe, test } from 'vitest';

import Oas from '../../src/index.js';
import docusign from '../__datasets__/docusign.json' with { type: 'json' };

const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

function sampleOperations(definition: OASDocument, count: number): [string, HttpMethods][] {
  const operations: [string, HttpMethods][] = [];

  Object.keys(definition.paths || {}).forEach(path => {
    if (operations.length >= count) {
      return;
    }

    Object.keys((definition.paths as Record<string, Record<string, unknown>>)[path] || {}).forEach(method => {
      if (httpMethods.includes(method.toLowerCase())) {
        operations.push([path, method as HttpMethods]);
      }
    });
  });

  return operations.slice(0, count);
}

function buildAllOfChainDefinition(chainLength: number, propertyCount: number): OASDocument {
  return {
    openapi: '3.0.3',
    info: { title: 'allOf chain', version: '1.0' },
    components: {
      schemas: Object.fromEntries(
        Array.from({ length: chainLength }, (_, i) => [
          `Link${i}`,
          i === chainLength - 1 ? { type: 'array' } : { allOf: [{ $ref: `#/components/schemas/Link${i + 1}` }] },
        ]),
      ),
    },
    paths: {
      '/': {
        get: {
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: Object.fromEntries(
                      Array.from({ length: propertyCount }, (_, i) => [
                        `prop${i}`,
                        { allOf: [{ $ref: '#/components/schemas/Link0' }], example: '["a"]' },
                      ]),
                    ),
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

const docusignDefinition = docusign as unknown as OASDocument;
const docusignOperations = sampleOperations(docusignDefinition, 50);
const allOfChainDefinition = buildAllOfChainDefinition(200, 100);

describe('example generation', () => {
  test('docusign (50 operations)', async ({ bench }) => {
    await bench('getResponseExamples() + getRequestBodyExamples()', () => {
      const oas = Oas.init(structuredClone(docusignDefinition));
      for (const [path, method] of docusignOperations) {
        const operation = oas.operation(path, method);
        operation.getResponseExamples();
        operation.getRequestBodyExamples();
      }
    }).run({ iterations: 3 });
  });

  test('JSON-encoded string examples behind a 200-deep `allOf` chain (100 properties)', async ({ bench }) => {
    await bench('getResponseExamples()', () => {
      Oas.init(structuredClone(allOfChainDefinition)).operation('/', 'get').getResponseExamples();
    }).run({ iterations: 5 });
  });
});
