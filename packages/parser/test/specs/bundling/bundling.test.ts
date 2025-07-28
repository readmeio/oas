import { describe, expect, it } from 'vitest';

import { bundle } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

describe('bundle', () => {
  it('should bundle successfully', async () => {
    const api = await bundle(relativePath('specs/bundling/nullish-example.yaml'));

    expect(api).toStrictEqual({
      openapi: '3.0.3',
      info: {
        version: '1.0',
        title: 'API definition with a nullish example property',
      },
      paths: {
        '/anything': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User-Information' },
                    },
                    example: { data: { first: null, last: 'lastname' } },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          'User-Information': {
            type: 'object',
            properties: { first: { type: 'boolean' }, last: { type: 'boolean' } },
          },
        },
      },
    });
  });
});
