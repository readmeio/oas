const { expect } = require('chai');

const OpenAPIParser = require('../../..');
const helper = require('../../utils/helper');
const path = require('../../utils/path');

describe('Large file memory leak protection', function () {
  this.timeout(20000);

  const tests = [
    {
      name: 'cloudflare spec (stringified to a single line)',
      file: 'cloudflare-stringified.json',
    },
    {
      name: 'cloudflare spec',
      file: 'cloudflare.json',
    },
  ];

  for (const test of tests) {
    it(test.name, async function () {
      try {
        await OpenAPIParser.validate(path.rel(`specs/large-file-memory-leak/${test.file}`));
        helper.shouldNotGetCalled();
      } catch (err) {
        expect(err).to.be.an.instanceOf(SyntaxError);
        expect(err.message).to.match(/^OpenAPI schema validation failed.\n(.*)+/);
        expect((err.message.match(/4xx is not expected to be here!/g) || []).length).to.equal(20);
        expect(err.message).to.contain(
          'Plus an additional 1016 errors. Please resolve the above and re-run validation to see more.'
        );
      }
    });
  }
});
