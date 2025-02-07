import { describe, it, expect, assert } from 'vitest';

import OpenAPIParser from '../../..';
import path from '../../utils/path';

describe('`validate.colorizeErrors` option', () => {
  it('should not colorize errors by default', async () => {
    const parser = new OpenAPIParser();

    try {
      await parser.validate(path.rel('specs/colorize-errors-option/invalid.json'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.contain('> 19 |             "type": "array",');
    }
  });

  it('should colorize errors when set', async function () {
    const parser = new OpenAPIParser();

    try {
      await parser.validate(path.rel('specs/colorize-errors-option/invalid.json'), {
        validate: {
          colorizeErrors: true,
        },
      });

      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.contain('\u001b');
    }
  });
});
