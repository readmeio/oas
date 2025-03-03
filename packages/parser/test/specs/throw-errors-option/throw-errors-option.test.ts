import { describe, it, expect } from 'vitest';

import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('`validate.errors.throwErrors` option', () => {
  it('should not colorize errors by default', async () => {
    await expect(relativePath('specs/colorize-errors-option/invalid.json')).not.toValidate({
      errors: [
        {
          message: expect.stringContaining('> 19 |             "type": "array",'),
        },
      ],
    });
  });

  it.only('should stringify errors when set', async () => {
    // await expect(relativePath('specs/better-errors/3.0/invalid-x-extension-root.yaml')).not.toValidate({
    //   errors: [{ message: expect.stringContaining('invalid-x-extension is not expected to be here!') }],
    // });

    const res = await validate(relativePath('specs/colorize-errors-option/invalid.json'), {
      validate: {
        throwErrors: true,
      },
    });

    console.log(res);

    // await expect(relativePath('specs/colorize-errors-option/invalid.json')).not.toValidate({
    //   options: {
    //     validate: {
    //       colorizeErrors: true,
    //     },
    //   },
    //   errors: [
    //     {
    //       message: expect.stringContaining('\u001b'),
    //     },
    //   ],
    // });
  });
});
