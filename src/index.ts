import type { Har } from 'har-format';
import * as validate from 'har-validator';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /**
       * Ensures that the expected HAR is a valid HAR representation.
       */
      toBeAValidHAR(): R;
    }
  }
}

export default function toBeAValidHAR(this: jest.MatcherUtils, har: Har): { message: () => string; pass: boolean } {
  return validate
    .request(har.log.entries[0].request)
    .then(() => {
      return {
        message: () => `expected supplied HAR not to be valid`,
        pass: true,
      };
    })
    .catch(err => {
      return {
        message: () => `expected supplied HAR to be valid\n\nError: ${this.utils.printReceived(err.errors)}`,
        pass: false,
      };
    });
}
