import type { SchemaObject } from '../../../src/types.js';

import { describe, it, expect } from 'vitest';

import { toJSONSchema } from '../../../src/lib/openapi-to-json-schema.js';
import generateJSONSchemaFixture from '../../__fixtures__/json-schema.js';

describe('`default` support in `openapi-to-json-schema`', () => {
  it('should support default', () => {
    const schema: SchemaObject = generateJSONSchemaFixture({ default: 'example default' });
    expect(toJSONSchema(schema)).toMatchSnapshot();
  });

  it('should support a default of `false`', () => {
    const schema: SchemaObject = generateJSONSchemaFixture({ default: false });
    expect(toJSONSchema(schema)).toMatchSnapshot();
  });

  it('should support a default on an array', () => {
    const schema: SchemaObject = {
      type: 'object',
      default: {
        array_parent: [1, 2, 3],
      },
      properties: {
        array: {
          type: 'array',
          default: ['foo', 'bar'],
          items: {
            type: 'string',
          },
        },
        array_optional: {
          type: 'array',
          default: ['foo', 'bar'],
          items: {
            type: 'string',
          },
        },
        array_parent: {
          type: 'array',
          items: {
            type: 'number',
          },
        },
      },
      required: ['array'],
    };

    const compiled = toJSONSchema(schema);
    expect(compiled.properties.array).toHaveProperty('default', ['foo', 'bar']);
    expect(compiled.properties.array_optional).toHaveProperty('default', ['foo', 'bar']);
    expect(compiled.properties.array_parent).toHaveProperty('default', [1, 2, 3]);
  });

  describe('dereferencing', () => {
    it('should support deeply nested defaults', () => {
      const schema: SchemaObject = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            default: {
              level2: {
                leaf1: 1,
                leaf2: 1,
                leaf3: 1,
                leaf4: 1,
              },
            },
            properties: {
              level2: {
                type: 'object',
                default: {
                  leaf2: 2,
                  leaf3: 2,
                },
                properties: {
                  leaf1: { type: 'number' },
                  leaf2: { type: 'number' },
                  leaf3: { type: 'number', default: 3 },
                  leaf4: { type: 'number' },
                },
              },
            },
          },
        },
      };

      const compiled = toJSONSchema(schema);
      expect(compiled).toStrictEqual({
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  leaf1: { type: 'number', default: 1 },
                  leaf2: { type: 'number', default: 2 },
                  leaf3: { type: 'number', default: 3 },
                  leaf4: { type: 'number', default: 1 },
                },
              },
            },
          },
        },
      });
    });

    it('should dereference object defaults down into their children schemas', () => {
      const schema: SchemaObject = {
        type: 'object',
        default: {
          id: 5678,
          category: {
            id: 4,
            name: 'Testing',
          },
          tags: [12, 34, 56, 78],
        },
        properties: {
          id: { type: 'integer', format: 'int64', readOnly: true },
          category: {
            type: 'object',
            properties: {
              id: { type: 'integer', format: 'int64' },
              name: {
                type: 'string',
                default: 'explicit default here',
              },
            },
          },
          name: {
            type: 'string',
            default: 'buster',
            example: 'doggie',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      };

      const compiled = toJSONSchema(schema);
      expect(compiled).toStrictEqual({
        type: 'object',
        properties: {
          id: expect.objectContaining({
            default: 5678,
          }),
          category: {
            type: 'object',
            properties: {
              id: expect.objectContaining({
                // This should be `4` but our parent `default` determination has the same problem as
                // `example` determination where if a matching key name exists upwards it'll pick
                // that.
                default: 5678,
              }),
              name: {
                type: 'string',
                default: 'explicit default here',
              },
            },
          },
          name: {
            type: 'string',
            default: 'buster',
            examples: ['doggie'],
          },
          tags: {
            type: 'array',
            default: [12, 34, 56, 78],
            items: {
              type: 'string',
            },
          },
        },
      });
    });

    // While it would be nice to be able to do this sort of default dereferencing for polymrphic
    // schemas there are way too many weird edge cases that crop up as a result of this.
    it('should not support being able to dereference a default into a `oneOf`', () => {
      const schema: SchemaObject = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            default: {
              level2: {
                leaf1: 'a',
              },
            },
            properties: {
              level2: {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      leaf1: {
                        type: 'string',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const compiled = toJSONSchema(schema);
      expect(compiled.properties.level1).toStrictEqual({
        type: 'object',
        properties: {
          level2: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  leaf1: {
                    type: 'string',
                  },
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('`globalDefaults` option', () => {
    it('should add `globalDefaults` if there are matches', () => {
      const schema: SchemaObject = {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64', readOnly: true },
          category: {
            type: 'object',
            properties: {
              id: { type: 'integer', format: 'int64' },
              name: { type: 'string' },
            },
          },
          name: { type: 'string', example: 'doggie' },
        },
      };

      const globalDefaults = {
        id: 5678,
        categoryTypo: {
          id: 4,
          name: 'Testing',
        },
      };

      const compiled = toJSONSchema(schema, { globalDefaults });

      expect((compiled.properties?.id as SchemaObject).default).toBe(5678);
      expect((compiled.properties?.category as SchemaObject).default).toBeUndefined();
    });
  });
});
