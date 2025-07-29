import { assert, describe, expect, it } from 'vitest';

import { type ValidationResult, validate } from '../../../src/index.js';
import { knownErrors } from './known-errors.js';
import realWorldAPIs from './real-world-apis.json';

const MAX_APIS_TO_TEST = 100;

describe(
  'Real-world APIs',
  {
    // Increase the timeouts by A LOT because:
    //   1) CI is really slow
    //   2) Some API definitions are HUGE and take a while to download
    //   3) If the download fails, we retry 2 times, which takes even more time
    //   4) Really large API definitions take longer to pase, dereference, and validate
    // timeout: host.ci ? 300000 : 60000, // 5 minutes in CI, 1 minute locally
  },
  () => {
    it.each(realWorldAPIs.slice(0, MAX_APIS_TO_TEST))('$name', async api => {
      let result: ValidationResult;

      try {
        result = await validate(api.url, {
          resolve: {
            http: {
              timeout: 500,
            },
          },
        });
      } catch (err) {
        // If we have errors pulling the API definition down then don't fail out.
        if (err.message.includes('Error downloading https://') || err.message.includes('socket hang up')) {
          return;
        }

        assert.fail(err.message);
      }

      if (result.valid === true) {
        expect(result.warnings).toHaveLength(0);

        if (api.name in knownErrors) {
          assert.fail(`${api.name} had known errors that are no longer a problem. Please remove them from the list.`);
        }
      } else if (api.name in knownErrors) {
        expect(result.errors).toHaveLength(knownErrors[api.name].total);
        expect(result.errors).toStrictEqual(knownErrors[api.name].errors);
        expect(result.warnings).toHaveLength(0);
      } else {
        // API is invalid and does not have any known errors.
        expect(result).toBeUndefined();
      }
    });
  },
);
