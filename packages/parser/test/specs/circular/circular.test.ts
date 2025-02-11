import type { ValidAPIDefinition } from '../../utils/helper.js';

import { describe, it, expect, assert } from 'vitest';

import { SwaggerParser } from '../../../src/index.js';
import * as helper from '../../utils/helper.js';
import * as path from '../../utils/path.js';

import bundledAPI from './bundled.js';
import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';
import validatedAPI from './validated.js';

describe('API with circular (recursive) $refs', () => {
  it('should parse successfully', async () => {
    const parser = new SwaggerParser();
    const api = await parser.parse(path.rel('specs/circular/circular.yaml'));

    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(parsedAPI.api);
    expect(parser.$refs.paths()).to.deep.equal([path.abs('specs/circular/circular.yaml')]);
  });

  it(
    'should resolve successfully',
    helper.testResolve(
      'specs/circular/circular.yaml',
      parsedAPI.api,
      'specs/circular/definitions/pet.yaml',
      parsedAPI.pet,
      'specs/circular/definitions/person.yaml',
      parsedAPI.person,
      'specs/circular/definitions/parent.yaml',
      parsedAPI.parent,
      'specs/circular/definitions/child.yaml',
      parsedAPI.child,
    ),
  );

  it('should dereference successfully', async () => {
    const parser = new SwaggerParser<ValidAPIDefinition>();
    const api = await parser.dereference(path.rel('specs/circular/circular.yaml'));

    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(dereferencedAPI);
    expect(api.definitions.person.properties.spouse).to.equal(api.definitions.person);
    expect(api.definitions.parent.properties.children.items).to.equal(api.definitions.child);
    expect(api.definitions.child.properties.parents.items).to.equal(api.definitions.parent);
  });

  it('should validate successfully', async () => {
    const parser = new SwaggerParser<ValidAPIDefinition>();
    const api = await parser.validate(path.rel('specs/circular/circular.yaml'));

    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(validatedAPI.fullyDereferenced);
    expect(api.definitions.person.properties.spouse).to.equal(api.definitions.person);
    expect(api.definitions.parent.properties.children.items).to.equal(api.definitions.child);
    expect(api.definitions.child.properties.parents.items).to.equal(api.definitions.parent);
  });

  it('should not dereference circular $refs if "options.dereference.circular" is "ignore"', async () => {
    const parser = new SwaggerParser<ValidAPIDefinition>();
    const api = await parser.validate(path.rel('specs/circular/circular.yaml'), {
      dereference: { circular: 'ignore' },
    });

    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(validatedAPI.ignoreCircular$Refs);
    expect(api.paths['/pet'].get.responses['200'].schema).to.equal(api.definitions.pet);
  });

  it('should fail validation if "options.dereference.circular" is false', async () => {
    try {
      const parser = new SwaggerParser();
      await parser.validate(path.rel('specs/circular/circular.yaml'), { dereference: { circular: false } });
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ReferenceError);
      expect(err.message).to.equal('The API contains circular references');
    }
  });

  it('should bundle successfully', async () => {
    const parser = new SwaggerParser();
    const api = await parser.bundle(path.rel('specs/circular/circular.yaml'));
    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(bundledAPI);
  });
});
