import { describe, expect, it } from 'vitest';

import { validate } from '../../../src/index.js';
import { compileErrors } from '../../../src/index.js';

describe('no-slash-paths', () => {
  it('should provide clear error message for paths missing leading slashes', async () => {
    await expect(validate(require.resolve('./invalid-no-slash-paths.json'))).resolves.toMatchSnapshot();
  });
});
