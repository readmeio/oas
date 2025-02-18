import type { ValidAPIDefinition } from '../../utils.js';

import { describe, it, expect, assert } from 'vitest';

import { bundle, parse, dereference, validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

import bundledAPI from './bundled.js';
import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';
import validatedAPI from './validated.js';

describe('API with circular (recursive) $refs', () => {
  it('should parse successfully', async () => {
    const api = await parse(relativePath('specs/circular/circular.yaml'));

    expect(api).to.deep.equal(parsedAPI.api);
  });

  it('should dereference successfully', async () => {
    const api = await dereference<ValidAPIDefinition>(relativePath('specs/circular/circular.yaml'));

    expect(api).to.deep.equal(dereferencedAPI);
    expect(api.definitions.person.properties.spouse).to.equal(api.definitions.person);
    expect(api.definitions.parent.properties.children.items).to.equal(api.definitions.child);
    expect(api.definitions.child.properties.parents.items).to.equal(api.definitions.parent);
  });

  it('should validate successfully', async () => {
    const api = await validate<ValidAPIDefinition>(relativePath('specs/circular/circular.yaml'));

    expect(api).to.deep.equal(validatedAPI.fullyDereferenced);
    expect(api.definitions.person.properties.spouse).to.equal(api.definitions.person);
    expect(api.definitions.parent.properties.children.items).to.equal(api.definitions.child);
    expect(api.definitions.child.properties.parents.items).to.equal(api.definitions.parent);
  });

  it('should not dereference circular $refs if "options.dereference.circular" is "ignore"', async () => {
    const api = await validate<ValidAPIDefinition>(relativePath('specs/circular/circular.yaml'), {
      dereference: { circular: 'ignore' },
    });

    expect(api).to.deep.equal(validatedAPI.ignoreCircular$Refs);
    expect(api.paths['/pet'].get.responses['200'].schema).to.equal(api.definitions.pet);
  });

  it('should fail validation if "options.dereference.circular" is false', async () => {
    try {
      await validate(relativePath('specs/circular/circular.yaml'), { dereference: { circular: false } });
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ReferenceError);
      expect(err.message).to.equal('The API contains circular references');
    }
  });

  it('should bundle successfully', async () => {
    const api = await bundle(relativePath('specs/circular/circular.yaml'));
    expect(api).to.deep.equal(bundledAPI);
  });
});
