import { describe, it, expect, assert } from 'vitest';

import { ValidationError } from '../../../src/errors.js';
import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

describe('`validate.errors.colorize` option', () => {
  it('should not colorize errors by default', async () => {
    try {
      await validate(relativePath('specs/colorize-errors-option/invalid.json'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.contain('> 19 |             "type": "array",');
    }
  });

  it('should colorize errors when set', async function () {
    try {
      await validate(relativePath('specs/colorize-errors-option/invalid.json'), {
        validate: {
          errors: {
            colorize: true,
          },
        },
      });

      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.contain('\u001b');
    }
  });
});
