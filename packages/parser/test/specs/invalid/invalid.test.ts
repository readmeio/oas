import { describe, it, expect, assert } from 'vitest';

import { ValidationError } from '../../../src/errors.js';
import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

describe("Invalid APIs (can't be parsed)", () => {
  it('not a valid API definition', async () => {
    try {
      await validate(relativePath('specs/invalid/not-swagger.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.contain('Supplied schema is not a valid API definition.');
    }
  });

  it('not a valid OpenAPI 3.1 definition', async () => {
    try {
      await validate(relativePath('specs/invalid/no-paths-or-webhooks.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.matchSnapshot();
    }
  });

  it('invalid Swagger version (1.2)', async () => {
    try {
      await validate(relativePath('specs/invalid/old-version.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.matchSnapshot();
    }
  });

  it('invalid Swagger version (3.0)', async () => {
    try {
      await validate(relativePath('specs/invalid/newer-version.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.matchSnapshot();
    }
  });

  it('numeric Swagger version (instead of a string)', async () => {
    try {
      await validate(relativePath('specs/invalid/numeric-version.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.matchSnapshot();
    }
  });

  it('numeric API version (instead of a string)', async () => {
    try {
      await validate(relativePath('specs/invalid/numeric-info-version.yaml'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.matchSnapshot();
    }
  });
});
