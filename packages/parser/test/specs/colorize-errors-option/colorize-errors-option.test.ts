import { describe, expect, it } from 'vitest';

import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('`validate.errors.colorize` option', () => {
  it('should not colorize errors by default', async () => {
    await expect(relativePath('specs/colorize-errors-option/invalid.json')).not.toValidate({
      errors: [
        {
          message: expect.stringContaining('> 19 |             "type": "array",'),
        },
      ],
    });
  });

  it('should colorize errors when set', async () => {
    await expect(relativePath('specs/colorize-errors-option/invalid.json')).not.toValidate({
      options: {
        validate: {
          errors: {
            colorize: true,
          },
        },
      },
      errors: [
        {
          message: expect.stringContaining('\u001b'),
        },
      ],
    });
  });
});
