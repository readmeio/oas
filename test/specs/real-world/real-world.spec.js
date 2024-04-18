const { host } = require('@jsdevtools/host-environment');

const OpenAPIParser = require('../../..');
const realWorldAPIs = require('../../fixtures/real-world-apis.json');

const knownErrors = require('./known-errors');

// How many APIs to test in "quick mode" and normal mode
const MAX_APIS_TO_TEST = process.argv.includes('--quick-test') ? 10 : 1500;
const START_AT_INDEX = 0;
const MAX_DOWNLOAD_RETRIES = 3;

describe('Real-world APIs', () => {
  beforeEach(function () {
    // Increase the timeouts by A LOT because:
    //   1) CI is really slow
    //   2) Some API definitions are HUGE and take a while to download
    //   3) If the download fails, we retry 2 times, which takes even more time
    //   4) Really large API definitions take longer to pase, dereference, and validate
    this.currentTest.timeout(host.ci ? 300000 : 60000); // 5 minutes in CI, 1 minute locally
    this.currentTest.slow(5000);
  });

  // Mocha requires us to create our tests synchronously. But the list of APIs is downloaded asynchronously.
  // So, we just create a bunch of placeholder tests, and then rename them later to reflect which API they're testing.
  for (let index = START_AT_INDEX; index < START_AT_INDEX + MAX_APIS_TO_TEST; index++) {
    if (!(index in realWorldAPIs)) {
      return;
    }

    it(`${index + 1}) `, testAPI(index));
  }

  /**
   * This Mocha test is repeated for each API in the APIs.guru registry
   */
  function testAPI(index) {
    return async function () {
      const api = realWorldAPIs[index];
      this.test.title += api.name;
      await validateApi(api);
    };
  }

  /**
   * Downloads an API definition and validates it.  Automatically retries if the download fails.
   */
  async function validateApi(api, attemptNumber = 1) {
    try {
      await OpenAPIParser.validate(api.url);
    } catch (error) {
      // Validation failed.  But is this a known error?
      const knownError = knownErrors.find(api, error);

      if (knownError) {
        if (knownError.whatToDo === 'ignore') {
          // Ignore the error.  It's a known problem with this API
          return null;
        } else if (knownError.whatToDo === 'retry') {
          if (attemptNumber >= MAX_DOWNLOAD_RETRIES) {
            console.error('        failed to download.  giving up.');
            return null;
          }

          // Wait a few seconds, then try the download again
          await new Promise(resolve => {
            console.error('        failed to download.  trying again...');
            setTimeout(resolve, 2000);
          });

          await validateApi(api, attemptNumber + 1);
        }
      } else {
        // This is not a known error
        console.error('\n\nERROR IN THIS API:', JSON.stringify(api, null, 2));
        throw error;
      }
    }

    return null;
  }
});
