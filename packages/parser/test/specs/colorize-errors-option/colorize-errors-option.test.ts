import { describe, it, expect, assert } from 'vitest';

import { SwaggerParser } from '../../../src/index.js';
import * as path from '../../utils/path.js';

describe('`validate.colorizeErrors` option', () => {
  it('should not colorize errors by default', async () => {
    const parser = new SwaggerParser();

    try {
      await parser.validate(path.rel('specs/colorize-errors-option/invalid.json'));
      assert.fail();
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.contain('> 19 |             "type": "array",');
    }
  });

  it('should colorize errors when set', async function () {
    const parser = new SwaggerParser();

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
