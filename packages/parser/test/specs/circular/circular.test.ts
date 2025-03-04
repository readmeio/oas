import type { ValidAPIDefinition } from '../../utils.js';

import { describe, it, expect, assert } from 'vitest';

import { bundle, parse, dereference, validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

import bundledAPI from './bundled.js';
import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';
import validatedAPI from './validated.js';

expect.extend({ toValidate });

describe('API with circular (recursive) $refs', () => {
  it('should parse successfully', async () => {
    const api = await parse(relativePath('specs/circular/circular.yaml'));

    expect(api).toStrictEqual(parsedAPI.api);
  });

  it('should dereference successfully', async () => {
    const api = await dereference<ValidAPIDefinition>(relativePath('specs/circular/circular.yaml'));

    expect(api).toStrictEqual(dereferencedAPI);
    expect(api.definitions.person.properties.spouse).toStrictEqual(api.definitions.person);
    expect(api.definitions.parent.properties.children.items).toStrictEqual(api.definitions.child);
    expect(api.definitions.child.properties.parents.items).toStrictEqual(api.definitions.parent);
  });

  it('should validate successfully', async () => {
    await expect(relativePath('specs/circular/circular.yaml')).toValidate();
  });

  it('should not dereference circular $refs if "options.dereference.circular" is "ignore"', async () => {
    const api = await dereference<ValidAPIDefinition>(relativePath('specs/circular/circular.yaml'), {
      dereference: { circular: 'ignore' },
    });

    expect(api).toStrictEqual(validatedAPI.ignoreCircular$Refs);
    expect(api.paths['/pet'].get.responses['200'].schema).toStrictEqual(api.definitions.pet);
  });

  it('should fail validation if "options.dereference.circular" is false', async () => {
    try {
      await validate(relativePath('specs/circular/circular.yaml'), { dereference: { circular: false } });
      assert.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(ReferenceError);
      expect(err.message).toBe(
        'The API contains circular references but the validator is configured to not permit them.',
      );
    }
  });

  it('should bundle successfully', async () => {
    const api = await bundle(relativePath('specs/circular/circular.yaml'));

    expect(api).toStrictEqual(bundledAPI);
  });
});
