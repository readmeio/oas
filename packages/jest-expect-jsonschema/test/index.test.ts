import assert from 'node:assert';

import { toBeValidJSONSchema, toBeValidJSONSchemas } from '../src/index.js';

expect.extend({ toBeValidJSONSchema, toBeValidJSONSchemas });

describe('toBeValidJSONSchema()', () => {
  it('should accept a valid JSON Schema object', async () => {
    await expect({
      type: 'string',
    }).toBeValidJSONSchema();
  });

  it('should reject an invalid JSON Schema object', async () => {
    await expect({
      type: 'bad',
    }).not.toBeValidJSONSchema();
  });

  describe('draft-04 support', () => {
    it('should support a draft-4 JSON Schema object by default', async () => {
      await expect({
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            examples: ['doggie'],
          },
        },
      }).toBeValidJSONSchema();
    });

    it('should support when `$schema` is pinned to draft-04', async () => {
      await expect({
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            examples: ['doggie'],
          },
        },
        $schema: 'http://json-schema.org/draft-04/schema#',
      }).toBeValidJSONSchema();
    });
  });

  describe('draft-2020-12 support', () => {
    it('should support when `$schema` is pinned to draft-04', async () => {
      await expect({
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            examples: ['doggie'],
          },
          status: {
            type: 'string',
            description: 'pet status in the store',
            enum: ['available', 'pending', 'sold'],
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema#',
      }).toBeValidJSONSchema();
    });
  });

  describe('non-standard keywords', () => {
    it('should not error on an `x-readme-ref-name` keyword', async () => {
      await expect({
        type: 'object',
        required: ['name', 'photoUrls'],
        properties: {
          name: {
            type: 'string',
            examples: ['doggie'],
          },
        },
        'x-readme-ref-name': 'Pet',
        $schema: 'http://json-schema.org/draft-04/schema#',
      }).toBeValidJSONSchema();
    });
  });
});

describe('toBeValidJSONSchemas()', () => {
  it('should fail if not supplied an array', async () => {
    try {
      await expect({
        type: 'bad',
      }).toBeValidJSONSchemas();

      assert.fail('we should have thrown an error');
    } catch (err: unknown) {
      // oxlint-disable-next-line jest/no-conditional-expect
      expect((err as Error).message).toMatch(/expected an array/i);
    }
  });

  it('should accept an array of valid JSON Schema object', async () => {
    await expect([
      {
        type: 'string',
      },
      {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            examples: ['doggie'],
          },
        },
      },
      {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            examples: ['doggie'],
          },
          status: {
            type: 'string',
            description: 'pet status in the store',
            enum: ['available', 'pending', 'sold'],
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema#',
      },
    ]).toBeValidJSONSchemas();
  });

  it('should reject if supplied an invalid JSON Schema object', async () => {
    await expect([
      {
        type: 'bad',
      },
      {
        type: 'string',
      },
    ]).not.toBeValidJSONSchemas();
  });
});
