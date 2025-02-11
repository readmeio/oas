import { describe, it, expect, assert } from 'vitest';

import OpenAPIParser from '../../../src';
import path from '../../utils/path';

describe("Invalid APIs (can't be parsed)", () => {
  it('not a Swagger API', async () => {
    try {
      await OpenAPIParser.parse(path.rel('specs/invalid/not-swagger.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.contain('not-swagger.yaml is not a valid API definition');
    }
  });

  it('not a valid OpenAPI 3.1 definition', async () => {
    try {
      await OpenAPIParser.parse(path.rel('specs/invalid/no-paths-or-webhooks.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.contain('no-paths-or-webhooks.yaml is not a valid OpenAPI definition');
    }
  });

  it('invalid Swagger version (1.2)', async () => {
    try {
      await OpenAPIParser.dereference(path.rel('specs/invalid/old-version.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.equal('Unrecognized Swagger version: 1.2. Expected 2.0');
    }
  });

  it('invalid Swagger version (3.0)', async () => {
    try {
      await OpenAPIParser.bundle(path.rel('specs/invalid/newer-version.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.equal('Unrecognized Swagger version: 3.0. Expected 2.0');
    }
  });

  it('numeric Swagger version (instead of a string)', async () => {
    try {
      await OpenAPIParser.validate(path.rel('specs/invalid/numeric-version.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.equal('Swagger version number must be a string (e.g. "2.0") not a number.');
    }
  });

  it('numeric API version (instead of a string)', async () => {
    try {
      await OpenAPIParser.validate(path.rel('specs/invalid/numeric-info-version.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.equal('API version number must be a string (e.g. "1.0.0") not a number.');
    }
  });
});
