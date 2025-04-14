import type { ValidAPIDefinition } from '../../utils.js';

import { describe, it, expect, assert } from 'vitest';

import { dereference, validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('API with extensive circular $refs that cause slowdowns', () => {
  it('should validate successfully', async () => {
    await expect(relativePath('specs/circular-slowdowns/schema.json')).toValidate();
  });

  it('should dereference successfully', async () => {
    const circularRefs = new Set<string>();

    const schema = await dereference<ValidAPIDefinition>(relativePath('specs/circular-slowdowns/schema.json'), {
      dereference: {
        onCircular: (ref: string) => circularRefs.add(ref),
      },
    });

    // Ensure that a non-circular $ref was dereferenced.
    expect(schema.components?.schemas?.ArrayOfMappedData).toStrictEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          mappingTypeName: { type: 'string' },
          sourceSystemValue: { type: 'string' },
          mappedValueID: { type: 'string' },
          mappedValue: { type: 'string' },
        },
        additionalProperties: false,
      },
    });

    // Ensure that a circular $ref **was** dereferenced.
    expect(circularRefs).toHaveLength(23);
    expect(schema.components?.schemas?.Customer?.properties?.customerNode).toStrictEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          customerNodeGuid: expect.any(Object),
          customerGuid: expect.any(Object),
          nodeId: expect.any(Object),
          customerGu: expect.any(Object),
        },
        additionalProperties: false,
      },
    });
  });

  it('should not dereference circular $refs if "options.dereference.circular" is "ignore"', async () => {
    const circularRefs = new Set<string>();

    const schema = await dereference<ValidAPIDefinition>(relativePath('specs/circular-slowdowns/schema.json'), {
      dereference: {
        circular: 'ignore',
        onCircular: (ref: string) => circularRefs.add(ref),
      },
    });

    // Ensure that a non-circular $ref was dereferenced.
    expect(schema.components?.schemas?.ArrayOfMappedData).toStrictEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          mappingTypeName: { type: 'string' },
          sourceSystemValue: { type: 'string' },
          mappedValueID: { type: 'string' },
          mappedValue: { type: 'string' },
        },
        additionalProperties: false,
      },
    });

    // Ensure that a circular $ref was **not** dereferenced.
    expect(circularRefs).toHaveLength(23);
    expect(schema.components?.schemas?.Customer?.properties?.customerNode).toStrictEqual({
      type: 'array',
      items: {
        $ref: '#/components/schemas/CustomerNode',
      },
    });
  });

  it('should fail validation if "options.dereference.circular" is false', async () => {
    try {
      await validate(relativePath('specs/circular-slowdowns/schema.json'), { dereference: { circular: false } });
      assert.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(ReferenceError);
      expect(err.message).toBe(
        'The API contains circular references but the validator is configured to not permit them.',
      );
    }
  });
});
