import type { SchemaObject } from '../../../src/types.js';

import { describe, it, expect } from 'vitest';

import { toJSONSchema } from '../../../src/lib/openapi-to-json-schema.js';
import generateJSONSchemaFixture from '../../__fixtures__/json-schema.js';

describe('`required` support in `openapi-to-json-schema`', () => {
  it('should support required', () => {
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
    expect(compiled.required).toStrictEqual(['array']);
  });

  describe('`required` boolean quirks', () => {
    it('should support a nested object `required` boolean', () => {
      const schema: SchemaObject = {
        type: 'object',
        properties: {
          buster: {
            type: 'string',
            required: true,
          },
        },
      };

      const compiled = toJSONSchema(schema);
      expect(compiled).toStrictEqual({
        type: 'object',
        properties: {
          buster: {
            type: 'string',
          },
        },
        required: ['buster'],
      });
    });

    it('should not support a `required` boolean in a primitive array `items`', () => {
      const schema: SchemaObject = {
        type: 'object',
        properties: {
          arr: {
            type: 'array',
            items: {
              type: 'string',
              required: true,
            },
          },
        },
      };

      expect(toJSONSchema(schema)).toStrictEqual({
        type: 'object',
        properties: {
          arr: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      });
    });

    it('should add a nested `required` boolean into an already existing parent `required` array', () => {
      const schema: SchemaObject = {
        type: 'object',
        properties: {
          age: {
            type: 'number',
          },
          buster: {
            required: true,
            type: 'string',
          },
        },
        required: ['age'],
      };

      const compiled = toJSONSchema(schema);
      expect(compiled).toStrictEqual({
        type: 'object',
        properties: {
          age: {
            type: 'number',
          },
          buster: {
            type: 'string',
          },
        },
        required: ['age', 'buster'],
      });
    });
  });

  it('should support complex cases of a nested `required` boolean', () => {
    const schema: SchemaObject = generateJSONSchemaFixture({ required: true });
    expect(toJSONSchema(schema)).toMatchSnapshot();
  });
});
