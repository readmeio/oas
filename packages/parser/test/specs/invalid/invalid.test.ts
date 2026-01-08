import { describe, expect, it } from 'vitest';

import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe("Invalid APIs (can't be parsed)", () => {
  it('not a valid API definition', async () => {
    await expect(validate(relativePath('specs/invalid/not-swagger.yaml'))).resolves.toMatchSnapshot();
  });

  describe('and the file is an OpenAPI 3.1 definition', () => {
    it('and the file has no paths, webhooks, or components', async () => {
      await expect(validate(relativePath('specs/invalid/no-paths-or-webhooks.yaml'))).resolves.toMatchSnapshot();
    });

    it('and the file has an empty paths object', async () => {
      await expect(validate(relativePath('specs/invalid/no-paths.yaml'))).resolves.toMatchSnapshot();
    });

    it('and the file has an empty webhooks object', async () => {
      await expect(validate(relativePath('specs/invalid/no-webhooks.yaml'))).resolves.toMatchSnapshot();
    });
  });

  it('invalid Swagger version (1.2)', async () => {
    await expect(validate(relativePath('specs/invalid/old-version.yaml'))).resolves.toMatchSnapshot();
  });

  it('invalid Swagger version (3.0)', async () => {
    await expect(validate(relativePath('specs/invalid/newer-version.yaml'))).resolves.toMatchSnapshot();
  });

  it('numeric Swagger version (instead of a string)', async () => {
    await expect(validate(relativePath('specs/invalid/numeric-version.yaml'))).resolves.toMatchSnapshot();
  });

  it('numeric API version (instead of a string)', async () => {
    await expect(validate(relativePath('specs/invalid/numeric-info-version.yaml'))).resolves.toMatchSnapshot();
  });
});
