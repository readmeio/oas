// oxlint-disable vitest/prefer-importing-vitest-globals, vitest/require-hook
import toBeAValidHAR from '../src/index.js';

import har from './__fixtures__/har.valid.json' with { type: 'json' };

expect.extend({ toBeAValidHAR });

describe('toBeAValidHAR()', () => {
  it('should accept a valid HAR', async () => {
    await expect(har).toBeAValidHAR();
  });

  it('should reject an invalid HAR', async () => {
    await expect({
      log: {
        entries: [
          {
            request: {
              url: 'https://example.com',
            },
          },
        ],
      },
    }).not.toBeAValidHAR();
  });

  it('should reject yet another invalid HAR', async () => {
    await expect({}).not.toBeAValidHAR();
  });
});
