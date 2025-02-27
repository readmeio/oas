import { describe, it, expect } from 'vitest';

import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe("Invalid APIs (can't be parsed)", () => {
  it('not a valid API definition', async () => {
    await expect(validate(relativePath('specs/invalid/not-swagger.yaml'))).rejects.toThrow(
      new SyntaxError('Supplied schema is not a valid API definition.'),
    );
  });

  it('not a valid OpenAPI 3.1 definition', async () => {
    await expect(validate(relativePath('specs/invalid/no-paths-or-webhooks.yaml'))).resolves.toMatchSnapshot();
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
