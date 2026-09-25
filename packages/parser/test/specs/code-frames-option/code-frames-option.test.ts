import { assert, describe, expect, it, vi } from 'vitest';

import { validate } from '../../../src/index.js';
import { validateSchema } from '../../../src/validators/schema.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

// oxlint-disable-next-line vitest/require-hook
expect.extend({ toValidate });

describe('`validate.errors.codeFrames` option', () => {
  it('should render code frames by default', async () => {
    await expect(relativePath('specs/colorize-errors-option/invalid.json')).not.toValidate({
      errors: [
        {
          message: expect.stringContaining('> 19 |             "type": "array",'),
        },
      ],
    });
  });

  it('should report plain messages when disabled', async () => {
    const res = await validate(relativePath('specs/colorize-errors-option/invalid.json'), {
      validate: { errors: { codeFrames: false } },
    });
    if (res.valid === true) {
      assert.fail();
    }

    expect(res.errors.length).toBeGreaterThan(0);
    for (const error of res.errors) {
      expect(error.message).toMatch(/^\/\S* must /);
      expect(error.message).not.toContain('|');
    }
  });

  it('should name an empty additional property in plain messages', () => {
    const api = {
      openapi: '3.0.3',
      info: { title: 'Empty property name', version: '1.0.0', '': 'unexpected' },
      paths: {},
    };

    expect(validateSchema(api, { validate: { errors: { codeFrames: false } } })).toStrictEqual({
      valid: false,
      errors: [{ message: '/info must NOT have additional properties ("")' }],
      warnings: [],
      additionalErrors: 0,
      specification: 'OpenAPI',
    });
  });

  it('should report plain messages when the API definition is too large to be stringified', () => {
    const api = {
      openapi: '3.0.3',
      info: { title: 'Too large to stringify' },
      paths: {},
    };

    // An API definition beyond the maximum string length of the engine cannot be pretty-printed
    // for code frames, so it must be treated as large.
    const originalStringify = JSON.stringify;
    const stringify = vi.spyOn(JSON, 'stringify').mockImplementation((value, ...args) => {
      if (value === api) {
        throw new RangeError('Invalid string length');
      }

      return originalStringify(value, ...args);
    });

    try {
      expect(validateSchema(api)).toStrictEqual({
        valid: false,
        errors: [{ message: "/info must have required property 'version'" }],
        warnings: [],
        additionalErrors: 0,
        specification: 'OpenAPI',
      });
    } finally {
      stringify.mockRestore();
    }
  });
});
