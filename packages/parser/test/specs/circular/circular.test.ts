import { describe, it, expect, assert } from 'vitest';

import OpenAPIParser from '../../..';
import * as helper from '../../utils/helper';
import path from '../../utils/path';

import bundledAPI from './bundled';
import dereferencedAPI from './dereferenced';
import parsedAPI from './parsed';
import validatedAPI from './validated';

describe('API with circular (recursive) $refs', () => {
  it('should parse successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.parse(path.rel('specs/circular/circular.yaml'));
    expect(api).to.equal(parser.api);
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
      'specs/circular/definitions/child.yaml',
      parsedAPI.child,
      'specs/circular/definitions/parent.yaml',
      parsedAPI.parent,
      'specs/circular/definitions/person.yaml',
      parsedAPI.person,
    ),
  );

  it('should dereference successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.dereference(path.rel('specs/circular/circular.yaml'));
    expect(api).to.equal(parser.api);
    expect(api).to.deep.equal(dereferencedAPI);
    // Reference equality
    expect(api.definitions.person.properties.spouse).to.equal(api.definitions.person);
    expect(api.definitions.parent.properties.children.items).to.equal(api.definitions.child);
    expect(api.definitions.child.properties.parents.items).to.equal(api.definitions.parent);
  });

  // @fixme temporarily skipped due to problems with the upgrade to @apidevtools/json-schema-ref-parser
  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip('should validate successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.validate(path.rel('specs/circular/circular.yaml'));
    expect(api).to.equal(parser.api);
    expect(api).to.deep.equal(validatedAPI.fullyDereferenced);
    // Reference equality
    expect(api.definitions.person.properties.spouse).to.equal(api.definitions.person);
    expect(api.definitions.parent.properties.children.items).to.equal(api.definitions.child);
    expect(api.definitions.child.properties.parents.items).to.equal(api.definitions.parent);
  });

  // @fixme temporarily skipped due to problems with the upgrade to @apidevtools/json-schema-ref-parser
  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip('should not dereference circular $refs if "options.dereference.circular" is "ignore"', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.validate(path.rel('specs/circular/circular.yaml'), {
      dereference: { circular: 'ignore' },
    });
    expect(api).to.equal(parser.api);
    expect(api).to.deep.equal(validatedAPI.ignoreCircular$Refs);
    // Reference equality
    expect(api.paths['/pet'].get.responses['200'].schema).to.equal(api.definitions.pet);
  });

  it('should fail validation if "options.dereference.circular" is false', async () => {
    const parser = new OpenAPIParser();

    try {
      await parser.validate(path.rel('specs/circular/circular.yaml'), { dereference: { circular: false } });
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ReferenceError);
      expect(err.message).to.equal('The API contains circular references');
    }
  });

  it('should bundle successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.bundle(path.rel('specs/circular/circular.yaml'));
    expect(api).to.equal(parser.api);
    expect(api).to.deep.equal(bundledAPI);
  });
});
